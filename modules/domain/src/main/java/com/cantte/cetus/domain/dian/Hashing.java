package com.cantte.cetus.domain.dian;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

public final class Hashing {

    private Hashing() {}

    public static String sha384Hex(String value) {
        return hex("SHA-384", value.getBytes(StandardCharsets.UTF_8));
    }

    public static String sha256Hex(byte[] value) {
        return hex("SHA-256", value);
    }

    private static String hex(String algorithm, byte[] value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance(algorithm).digest(value));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(algorithm + " not available", e);
        }
    }
}
