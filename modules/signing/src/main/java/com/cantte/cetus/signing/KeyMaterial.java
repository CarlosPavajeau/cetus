package com.cantte.cetus.signing;

import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.List;

/** Private key plus certificate chain (leaf first) loaded from the issuer's PKCS#12. */
public record KeyMaterial(PrivateKey privateKey, X509Certificate certificate, List<X509Certificate> chain) {

    public KeyMaterial {
        chain = List.copyOf(chain);
    }
}
