package com.cantte.cetus.api.auth;

import com.cantte.cetus.domain.dian.Hashing;
import com.cantte.cetus.domain.model.Environment;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

/** API keys look like cetus_test_XXXX / cetus_live_XXXX. Only the SHA-256 hash is stored. */
public final class ApiKeys {

    private static final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private ApiKeys() {
    }

    public static String generate(Environment environment) {
        StringBuilder key = new StringBuilder("cetus_").append(environment.name().toLowerCase()).append('_');
        for (int i = 0; i < 40; i++) {
            key.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return key.toString();
    }

    public static String hash(String key) {
        return Hashing.sha256Hex(key.getBytes(StandardCharsets.UTF_8));
    }

    public static String prefix(String key) {
        return key.substring(0, Math.min(key.length(), 18));
    }
}
