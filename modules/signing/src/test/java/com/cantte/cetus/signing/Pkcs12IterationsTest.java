package com.cantte.cetus.signing;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.PBEParameterSpec;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigInteger;
import java.security.AlgorithmParameters;
import java.security.KeyStore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** PKCS#12 files from OpenSSL (defaults, 3DES, legacy RC2) and the JDK open; crafted ones are refused. */
class Pkcs12IterationsTest {

    private static final char[] PASSWORD = "cetus-test".toCharArray();

    @ParameterizedTest
    @ValueSource(strings = {"/test-signer.p12", "/pkcs12/openssl-default.p12", "/pkcs12/openssl-3des.p12",
            "/pkcs12/openssl-legacy-rc2.p12"})
    void certificatesExportedWithTheUsualSettingsOpen(String file) throws IOException {
        KeyMaterial keys = Pkcs12Loader.loadUntrusted(resource(file), PASSWORD);

        assertThat(keys.certificate()).isNotNull();
    }

    @Test
    void highIterationCountsAreRefusedBeforeTheJdkOpensTheFile() throws IOException {
        // MAC, certificates and key at 1,000,000 each (openssl pkcs12 -export -iter 1000000).
        byte[] pkcs12 = resource("/pkcs12/openssl-1m.p12");

        long started = System.nanoTime();
        assertThatThrownBy(() -> Pkcs12Loader.loadUntrusted(pkcs12, PASSWORD))
                .isInstanceOf(SigningException.class)
                .hasNoCause()
                .hasMessageContaining("too many key derivations");
        // The MAC is counted first and needs no decryption: nothing was derived.
        assertThat((System.nanoTime() - started) / 1_000_000).isLessThan(100);
    }

    @Test
    void aKeyWithAHighIterationCountIsRefused() throws Exception {
        KeyStore source = KeyStore.getInstance("PKCS12");
        source.load(new java.io.ByteArrayInputStream(resource("/test-signer.p12")), PASSWORD);
        String alias = source.aliases().nextElement();
        KeyStore.PrivateKeyEntry entry = (KeyStore.PrivateKeyEntry) source.getEntry(alias,
                new KeyStore.PasswordProtection(PASSWORD));
        KeyStore crafted = KeyStore.getInstance("PKCS12");
        crafted.load(null, null);
        crafted.setEntry(alias, entry, new KeyStore.PasswordProtection(PASSWORD, "PBEWithHmacSHA256AndAES_256",
                new PBEParameterSpec(new byte[16], 2_000_000, new IvParameterSpec(new byte[16]))));
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        crafted.store(out, PASSWORD);

        assertThatThrownBy(() -> Pkcs12Iterations.check(out.toByteArray(), PASSWORD))
                .isInstanceOf(SigningException.class)
                .hasMessageContaining("too many key derivations");
    }

    @Test
    void aKeyHiddenInAnEncryptedContainerIsCountedToo() throws Exception {
        // The container is cheap to open; the key inside asks for 4,000,000 iterations.
        byte[] pkcs12 = withKeyInsideEncryptedContainer(2_048, 4_000_000);

        assertThatThrownBy(() -> Pkcs12Iterations.check(pkcs12, PASSWORD))
                .isInstanceOf(SigningException.class)
                .hasMessageContaining("too many key derivations");
    }

    @Test
    void anEncryptedContainerWithAReasonableKeyPasses() throws Exception {
        Pkcs12Iterations.check(withKeyInsideEncryptedContainer(2_048, 2_048), PASSWORD);
    }

    @Test
    void theWrongPasswordFailsLikeTheJdkDoes() throws Exception {
        byte[] pkcs12 = withKeyInsideEncryptedContainer(2_048, 2_048);

        assertThatThrownBy(() -> Pkcs12Iterations.check(pkcs12, "wrong".toCharArray()))
                .isInstanceOf(SigningException.class)
                // With a cause, the API shows its generic "check the file and its password" message.
                .satisfies(e -> assertThat(e.getCause()).isNotNull());
    }

    @Test
    void garbageIsNotAPkcs12() {
        assertThatThrownBy(() -> Pkcs12Iterations.check(new byte[]{0x30, (byte) 0x84, 1, 2, 3, 4}, PASSWORD))
                .isInstanceOf(SigningException.class)
                .hasNoCause()
                .hasMessage("The file is not a valid PKCS#12");
        // Deep nesting is refused instead of overflowing the stack.
        byte[] nested = new byte[2_000];
        for (int i = 0; i < nested.length; i += 2) {
            nested[i] = 0x30;
            nested[i + 1] = (byte) 0x80;
        }
        assertThatThrownBy(() -> Pkcs12Iterations.check(nested, PASSWORD)).isInstanceOf(SigningException.class);
    }

    /**
     * A PFX without MAC whose only container is encrypted (PBES2) and holds a shrouded key bag. The JDK never
     * writes keys inside an encrypted container, but it opens them.
     */
    private static byte[] withKeyInsideEncryptedContainer(int containerIterations, int keyIterations) throws Exception {
        AlgorithmParameters keyParameters = AlgorithmParameters.getInstance("PBEWithHmacSHA256AndAES_256");
        keyParameters.init(new PBEParameterSpec(new byte[16], keyIterations, new IvParameterSpec(new byte[16])));
        byte[] keyBag = seq(oid("1.2.840.113549.1.12.10.1.2"),
                explicit0(seq(algorithm(keyParameters), octets(new byte[48]))));
        byte[] safeContents = seq(keyBag);

        Cipher cipher = Cipher.getInstance("PBEWithHmacSHA256AndAES_256");
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeyFactory.getInstance("PBE").generateSecret(new PBEKeySpec(PASSWORD)),
                new PBEParameterSpec(new byte[16], containerIterations, new IvParameterSpec(new byte[16])));
        byte[] encrypted = cipher.doFinal(safeContents);
        byte[] encryptedData = seq(integer(0),
                seq(oid("1.2.840.113549.1.7.1"), algorithm(cipher.getParameters()), tlv(0x80, encrypted)));
        byte[] authSafe = seq(seq(oid("1.2.840.113549.1.7.6"), explicit0(encryptedData)));
        return seq(integer(3), seq(oid("1.2.840.113549.1.7.1"), explicit0(octets(authSafe))));
    }

    private static byte[] algorithm(AlgorithmParameters parameters) throws IOException {
        return seq(oid("1.2.840.113549.1.5.13"), parameters.getEncoded());
    }

    private static byte[] seq(byte[]... parts) {
        return tlv(0x30, parts);
    }

    private static byte[] explicit0(byte[] value) {
        return tlv(0xa0, value);
    }

    private static byte[] octets(byte[] value) {
        return tlv(0x04, value);
    }

    private static byte[] integer(int value) {
        return tlv(0x02, BigInteger.valueOf(value).toByteArray());
    }

    private static byte[] oid(String dotted) {
        String[] arcs = dotted.split("\\.");
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        base128(out, Long.parseLong(arcs[0]) * 40 + Long.parseLong(arcs[1]));
        for (int i = 2; i < arcs.length; i++) {
            base128(out, Long.parseLong(arcs[i]));
        }
        return tlv(0x06, out.toByteArray());
    }

    private static void base128(ByteArrayOutputStream out, long value) {
        int groups = Math.max(1, (64 - Long.numberOfLeadingZeros(value) + 6) / 7);
        for (int i = groups - 1; i >= 0; i--) {
            out.write((int) ((value >> (7 * i)) & 0x7f) | (i > 0 ? 0x80 : 0));
        }
    }

    private static byte[] tlv(int tag, byte[]... parts) {
        ByteArrayOutputStream content = new ByteArrayOutputStream();
        for (byte[] part : parts) {
            content.writeBytes(part);
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(tag);
        int length = content.size();
        if (length < 0x80) {
            out.write(length);
        } else if (length < 0x100) {
            out.write(0x81);
            out.write(length);
        } else {
            out.write(0x82);
            out.write(length >> 8);
            out.write(length & 0xff);
        }
        out.writeBytes(content.toByteArray());
        return out.toByteArray();
    }

    private static byte[] resource(String name) throws IOException {
        try (var in = Pkcs12IterationsTest.class.getResourceAsStream(name)) {
            return in.readAllBytes();
        }
    }
}
