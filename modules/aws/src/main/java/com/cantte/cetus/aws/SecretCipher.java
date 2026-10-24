package com.cantte.cetus.aws;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.kms.KmsClient;
import software.amazon.awssdk.services.kms.model.DataKeySpec;
import software.amazon.awssdk.services.kms.model.GenerateDataKeyResponse;

/**
 * Envelope encryption with AWS KMS. Each secret gets its own data key; the result is a single
 * self-contained blob ("sealed" value) stored in Postgres or S3:
 *
 * <pre>[1 byte version][2 bytes key length][encrypted data key][12 bytes IV][AES-GCM ciphertext]</pre>
 *
 * A database dump alone reveals nothing: decrypting requires kms:Decrypt on the master key.
 */
@ApplicationScoped
public class SecretCipher {

    private static final byte VERSION = 1;
    private static final int IV_LENGTH = 12;
    private static final int TAG_BITS = 128;

    private final SecureRandom random = new SecureRandom();

    @Inject
    KmsClient kms;

    @ConfigProperty(name = "cetus.aws.kms-key-id")
    String keyId;

    public byte[] seal(byte[] plaintext) {
        GenerateDataKeyResponse dataKey =
                kms.generateDataKey(r -> r.keyId(keyId).keySpec(DataKeySpec.AES_256));
        byte[] key = dataKey.plaintext().asByteArray();
        try {
            byte[] iv = new byte[IV_LENGTH];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(TAG_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plaintext);
            byte[] encryptedKey = dataKey.ciphertextBlob().asByteArray();

            return ByteBuffer.allocate(1 + 2 + encryptedKey.length + IV_LENGTH + ciphertext.length)
                    .put(VERSION)
                    .putShort((short) encryptedKey.length)
                    .put(encryptedKey)
                    .put(iv)
                    .put(ciphertext)
                    .array();
        } catch (Exception e) {
            throw new IllegalStateException("Could not seal secret", e);
        } finally {
            Arrays.fill(key, (byte) 0);
        }
    }

    public byte[] open(byte[] sealed) {
        ByteBuffer buffer = ByteBuffer.wrap(sealed);
        if (buffer.get() != VERSION) {
            throw new IllegalStateException("Unknown sealed secret version");
        }
        byte[] encryptedKey = new byte[buffer.getShort()];
        buffer.get(encryptedKey);
        byte[] iv = new byte[IV_LENGTH];
        buffer.get(iv);
        byte[] ciphertext = new byte[buffer.remaining()];
        buffer.get(ciphertext);

        byte[] key = kms.decrypt(r -> r.keyId(keyId).ciphertextBlob(SdkBytes.fromByteArray(encryptedKey)))
                .plaintext()
                .asByteArray();
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(TAG_BITS, iv));
            return cipher.doFinal(ciphertext);
        } catch (Exception e) {
            throw new IllegalStateException("Could not open secret", e);
        } finally {
            Arrays.fill(key, (byte) 0);
        }
    }

    public byte[] sealText(String value) {
        return seal(value.getBytes(StandardCharsets.UTF_8));
    }

    public String openText(byte[] sealed) {
        return new String(open(sealed), StandardCharsets.UTF_8);
    }
}
