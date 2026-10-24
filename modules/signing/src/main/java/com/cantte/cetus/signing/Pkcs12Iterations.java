package com.cantte.cetus.signing;

import java.io.ByteArrayOutputStream;
import java.math.BigInteger;
import java.security.AlgorithmParameters;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/**
 * Bounds the key derivations a PKCS#12 file asks for, before the JDK opens it.
 *
 * <p>The MAC, every encrypted container and every key name their own iteration count, and the JDK accepts up
 * to 5,000,000 in each: a crafted file of a few KB can cost seconds of CPU to open. The counts are read from
 * the file and added up; a container is decrypted (with its count already added) only to read the counts of
 * the keys inside it. OpenSSL writes 2,048 per derivation and the JDK 10,000, so real certificates stay far
 * below {@link #MAX_TOTAL}.
 */
final class Pkcs12Iterations {

    static final long MAX_TOTAL = 600_000;

    private static final String DATA = "1.2.840.113549.1.7.1";
    private static final String ENCRYPTED_DATA = "1.2.840.113549.1.7.6";
    private static final String SHROUDED_KEY_BAG = "1.2.840.113549.1.12.10.1.2";
    private static final String SAFE_CONTENTS_BAG = "1.2.840.113549.1.12.10.1.6";
    private static final String PKCS12_PBE = "1.2.840.113549.1.12.1.";
    private static final String PKCS5 = "1.2.840.113549.1.5.";
    private static final String PBKDF2 = PKCS5 + "12";
    private static final String PBES2 = PKCS5 + "13";
    private static final String PBMAC1 = PKCS5 + "14";

    private final char[] password;
    private long total;

    private Pkcs12Iterations(char[] password) {
        this.password = password;
    }

    /** Throws {@link SigningException} without a cause when the file asks for more than {@link #MAX_TOTAL}. */
    static void check(byte[] pkcs12, char[] password) {
        new Pkcs12Iterations(password).pfx(Der.parse(pkcs12));
    }

    private void pfx(Der pfx) {
        // PFX: version, authSafe, macData. The MAC needs no decryption, so it is counted first.
        if (pfx.size() > 2) {
            Der macData = pfx.child(2);
            Der macAlgorithm = macData.child(0).child(0);
            if (macAlgorithm.child(0).oid().equals(PBMAC1)) {
                spend(pbkdf2(macAlgorithm.child(1).child(0)));
            } else {
                spend(macData.size() > 2 ? macData.child(2).intValue() : 1);
            }
        }
        Der authSafe = pfx.child(1);
        if (!authSafe.child(0).oid().equals(DATA)) {
            throw new SigningException("The PKCS#12 file must be protected with a password");
        }
        for (Der contentInfo : Der.parse(authSafe.child(1).child(0).octets()).children()) {
            String type = contentInfo.child(0).oid();
            if (type.equals(DATA)) {
                safeContents(Der.parse(contentInfo.child(1).child(0).octets()));
            } else if (type.equals(ENCRYPTED_DATA)) {
                Der encryptedContentInfo = contentInfo.child(1).child(0).child(1);
                Der algorithm = encryptedContentInfo.child(1);
                spend(iterations(algorithm));
                safeContents(Der.parse(
                        decrypt(algorithm, encryptedContentInfo.child(2).octets())));
            }
        }
    }

    private void safeContents(Der bags) {
        for (Der bag : bags.children()) {
            String type = bag.child(0).oid();
            if (type.equals(SHROUDED_KEY_BAG)) {
                spend(iterations(bag.child(1).child(0).child(0)));
            } else if (type.equals(SAFE_CONTENTS_BAG)) {
                safeContents(bag.child(1).child(0));
            }
        }
    }

    private void spend(long iterations) {
        total += iterations;
        if (total > MAX_TOTAL) {
            throw new SigningException("The PKCS#12 file asks for too many key derivations (" + total
                    + "+ iterations; at most " + MAX_TOTAL + "): export it again with the default settings");
        }
    }

    /** Iteration count of a password-based encryption algorithm: PKCS#12, PBES1 or PBES2. */
    private static long iterations(Der algorithm) {
        String oid = algorithm.child(0).oid();
        if (oid.equals(PBES2)) {
            return pbkdf2(algorithm.child(1).child(0));
        }
        if (oid.startsWith(PKCS12_PBE) || (oid.startsWith(PKCS5) && !oid.equals(PBKDF2) && !oid.equals(PBMAC1))) {
            // PBEParameter: salt, iterations.
            return algorithm.child(1).child(1).intValue();
        }
        throw new SigningException("The PKCS#12 file uses an unsupported encryption algorithm (" + oid + ")");
    }

    private static long pbkdf2(Der keyDerivation) {
        if (!keyDerivation.child(0).oid().equals(PBKDF2)) {
            throw new SigningException("The PKCS#12 file uses an unsupported key derivation");
        }
        // PBKDF2-params: salt, iterationCount, keyLength?, prf?
        return keyDerivation.child(1).child(1).intValue();
    }

    /** Decrypts a container as the JDK's PKCS12KeyStore does. */
    private byte[] decrypt(Der algorithm, byte[] encrypted) {
        try {
            String oid = algorithm.child(0).oid();
            AlgorithmParameters parameters = AlgorithmParameters.getInstance(oid.equals(PBES2) ? "PBES2" : oid);
            parameters.init(algorithm.child(1).encoded());
            // PBES2 parameters name their cipher, e.g. PBEWithHmacSHA256AndAES_256.
            Cipher cipher = Cipher.getInstance(oid.equals(PBES2) ? parameters.toString() : oid);
            cipher.init(
                    Cipher.DECRYPT_MODE,
                    SecretKeyFactory.getInstance("PBE").generateSecret(new PBEKeySpec(password)),
                    parameters);
            return cipher.doFinal(encrypted);
        } catch (SigningException e) {
            throw e;
        } catch (Exception e) {
            throw new SigningException("Could not read the PKCS#12 file: " + e.getMessage(), e);
        }
    }

    /**
     * Just enough of BER to walk a PKCS#12 file: definite and indefinite lengths, and octet strings split in
     * segments. Anything else is malformed.
     */
    static final class Der {

        private static final int MAX_DEPTH = 32;

        private final byte[] source;
        private final int start;
        private final int end;
        private final int tag;
        private final byte[] content;
        private final List<Der> children;

        private Der(byte[] source, int start, int end, int tag, byte[] content, List<Der> children) {
            this.source = source;
            this.start = start;
            this.end = end;
            this.tag = tag;
            this.content = content;
            this.children = children;
        }

        static Der parse(byte[] bytes) {
            int[] position = {0};
            Der value = read(bytes, position, bytes.length, 0);
            if (position[0] != bytes.length) {
                throw malformed();
            }
            return value;
        }

        private static Der read(byte[] bytes, int[] position, int limit, int depth) {
            if (depth > MAX_DEPTH || position[0] + 2 > limit) {
                throw malformed();
            }
            int start = position[0];
            int tag = bytes[position[0]++] & 0xff;
            if ((tag & 0x1f) == 0x1f) {
                throw malformed();
            }
            boolean constructed = (tag & 0x20) != 0;
            int first = bytes[position[0]++] & 0xff;
            if (first == 0x80) {
                if (!constructed) {
                    throw malformed();
                }
                List<Der> children = new ArrayList<>();
                while (true) {
                    if (position[0] + 2 > limit) {
                        throw malformed();
                    }
                    if (bytes[position[0]] == 0 && bytes[position[0] + 1] == 0) {
                        position[0] += 2;
                        return new Der(bytes, start, position[0], tag, null, children);
                    }
                    children.add(read(bytes, position, limit, depth + 1));
                }
            }
            int length = first;
            if (first > 0x80) {
                int octets = first & 0x7f;
                if (octets > 3 || position[0] + octets > limit) {
                    throw malformed();
                }
                length = 0;
                for (int i = 0; i < octets; i++) {
                    length = (length << 8) | (bytes[position[0]++] & 0xff);
                }
            }
            int contentEnd = position[0] + length;
            if (contentEnd > limit) {
                throw malformed();
            }
            if (!constructed) {
                byte[] content = Arrays.copyOfRange(bytes, position[0], contentEnd);
                position[0] = contentEnd;
                return new Der(bytes, start, contentEnd, tag, content, List.of());
            }
            List<Der> children = new ArrayList<>();
            while (position[0] < contentEnd) {
                children.add(read(bytes, position, contentEnd, depth + 1));
            }
            return new Der(bytes, start, contentEnd, tag, null, children);
        }

        int size() {
            return children.size();
        }

        List<Der> children() {
            return children;
        }

        Der child(int index) {
            if (index >= children.size()) {
                throw malformed();
            }
            return children.get(index);
        }

        /** The bytes of a primitive value, or of the segments of a constructed octet string, joined. */
        byte[] octets() {
            if (content != null) {
                return content;
            }
            ByteArrayOutputStream joined = new ByteArrayOutputStream();
            for (Der segment : children) {
                joined.writeBytes(segment.octets());
            }
            return joined.toByteArray();
        }

        /** An INTEGER; above Integer.MAX_VALUE counts as that, which is over any budget anyway. */
        long intValue() {
            if (tag != 0x02 || content == null || content.length == 0) {
                throw malformed();
            }
            BigInteger value = new BigInteger(content);
            if (value.signum() < 0) {
                throw malformed();
            }
            return value.bitLength() > 31 ? Integer.MAX_VALUE : value.intValue();
        }

        String oid() {
            if (tag != 0x06 || content == null || content.length == 0) {
                throw malformed();
            }
            StringBuilder oid = new StringBuilder();
            long arc = 0;
            boolean first = true;
            for (byte b : content) {
                if (arc > (Long.MAX_VALUE >> 7)) {
                    throw malformed();
                }
                arc = (arc << 7) | (b & 0x7f);
                if ((b & 0x80) == 0) {
                    if (first) {
                        int top = (int) Math.min(arc / 40, 2);
                        oid.append(top).append('.').append(arc - top * 40L);
                        first = false;
                    } else {
                        oid.append('.').append(arc);
                    }
                    arc = 0;
                }
            }
            return oid.toString();
        }

        /** The value as it appears in the file, tag and length included. */
        byte[] encoded() {
            return Arrays.copyOfRange(source, start, end);
        }

        private static SigningException malformed() {
            return new SigningException("The file is not a valid PKCS#12");
        }
    }
}
