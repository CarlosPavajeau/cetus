package com.cantte.cetus.worker.support;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

final class SealedFingerprint {
    private SealedFingerprint() {}

    static String of(byte[] sealed) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(sealed));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }
}
