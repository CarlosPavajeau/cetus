package com.cantte.cetus.worker.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.signing.KeyMaterial;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.security.KeyStore;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class KeyMaterialCacheTest {

    private static final String CERTIFICATE = "certificates/sandbox/cetus-sandbox.p12.sealed";
    private static final String PASSWORD = "certificates/sandbox/cetus-sandbox.password.sealed";

    @Test
    void aCertificateWithItsPasswordInStorageIsRotatedWithIt() throws Exception {
        FakeDocumentStorage storage = new FakeDocumentStorage();
        FakeSecretCipher cipher = new FakeSecretCipher();
        KeyMaterialCache cache = new KeyMaterialCache();
        cache.storage = storage;
        cache.cipher = cipher;
        Instant start = Instant.parse("2026-10-23T12:00:00Z");
        cache.clock = Clock.fixed(start, ZoneOffset.UTC);
        var ref = new ProcessingContext.CertificateRef(UUID.randomUUID(), CERTIFICATE, null, PASSWORD);

        byte[] signer = testSigner();
        storage.put(CERTIFICATE, cipher.seal(signer), "application/octet-stream");
        storage.put(PASSWORD, cipher.sealText("cetus-test"), "application/octet-stream");
        KeyMaterial first = cache.get(ref);

        // Replaced in storage, the certificate under another password: the next load reads both again.
        storage.put(
                CERTIFICATE, cipher.seal(withPassword(signer, "cetus-test", "rotated")), "application/octet-stream");
        storage.put(PASSWORD, cipher.sealText("rotated"), "application/octet-stream");
        cache.clock = Clock.fixed(start.plus(Duration.ofMinutes(11)), ZoneOffset.UTC);

        KeyMaterial rotated = cache.get(ref);
        assertThat(rotated).isNotSameAs(first);
        assertThat(rotated.certificate()).isEqualTo(first.certificate());
    }

    private static byte[] testSigner() throws Exception {
        try (InputStream in = KeyMaterialCacheTest.class.getResourceAsStream("/test-signer.p12")) {
            return in.readAllBytes();
        }
    }

    private static byte[] withPassword(byte[] pkcs12, String current, String next) throws Exception {
        KeyStore keyStore = KeyStore.getInstance("PKCS12");
        keyStore.load(new java.io.ByteArrayInputStream(pkcs12), current.toCharArray());
        KeyStore copy = KeyStore.getInstance("PKCS12");
        copy.load(null, null);
        String alias = keyStore.aliases().nextElement();
        copy.setKeyEntry(
                alias,
                keyStore.getKey(alias, current.toCharArray()),
                next.toCharArray(),
                keyStore.getCertificateChain(alias));
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        copy.store(out, next.toCharArray());
        return out.toByteArray();
    }
}
