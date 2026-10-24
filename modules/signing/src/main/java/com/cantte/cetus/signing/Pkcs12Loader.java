package com.cantte.cetus.signing;

import java.io.ByteArrayInputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/** Loads a .p12/.pfx in memory. The bytes come already decrypted from KMS; nothing touches disk. */
public final class Pkcs12Loader {

    private Pkcs12Loader() {}

    /**
     * Loads a file uploaded by a user: its key derivations are bounded first (see {@link Pkcs12Iterations}),
     * so a crafted file cannot keep the CPU busy for seconds.
     */
    public static KeyMaterial loadUntrusted(byte[] pkcs12, char[] password) {
        Pkcs12Iterations.check(pkcs12, password);
        return load(pkcs12, password);
    }

    public static KeyMaterial load(byte[] pkcs12, char[] password) {
        try {
            KeyStore keyStore = KeyStore.getInstance("PKCS12");
            keyStore.load(new ByteArrayInputStream(pkcs12), password);
            for (String alias : Collections.list(keyStore.aliases())) {
                if (!keyStore.isKeyEntry(alias)) {
                    continue;
                }
                PrivateKey key = (PrivateKey) keyStore.getKey(alias, password);
                Certificate[] chain = keyStore.getCertificateChain(alias);
                List<X509Certificate> certificates =
                        Arrays.stream(chain).map(X509Certificate.class::cast).toList();
                return new KeyMaterial(key, certificates.getFirst(), certificates);
            }
            throw new SigningException("The PKCS#12 file does not contain a private key");
        } catch (SigningException e) {
            throw e;
        } catch (Exception e) {
            throw new SigningException("Could not read the PKCS#12 file: " + e.getMessage(), e);
        }
    }
}
