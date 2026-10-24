package com.cantte.cetus.api.support;

import com.cantte.cetus.aws.SecretCipher;
import io.quarkus.test.Mock;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Base64;

/** Reversible stand-in for KMS envelope encryption, so tests need no AWS. */
@Mock
@ApplicationScoped
public class FakeSecretCipher extends SecretCipher {

    @Override
    public byte[] seal(byte[] plaintext) {
        return Base64.getEncoder().encode(plaintext);
    }

    @Override
    public byte[] open(byte[] sealed) {
        return Base64.getDecoder().decode(sealed);
    }
}
