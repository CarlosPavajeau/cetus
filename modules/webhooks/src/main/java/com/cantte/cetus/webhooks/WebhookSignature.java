package com.cantte.cetus.webhooks;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

/**
 * Standard Webhooks signatures (the scheme Svix uses): {@code webhook-signature: v1,<base64>} where the
 * value is the HMAC-SHA256 of {@code <webhook-id>.<webhook-timestamp>.<body>} keyed with the base64 part of
 * the {@code whsec_} secret. Integrators can verify it with any Standard Webhooks library.
 */
public final class WebhookSignature {

    public static final String ID_HEADER = "webhook-id";
    public static final String TIMESTAMP_HEADER = "webhook-timestamp";
    public static final String SIGNATURE_HEADER = "webhook-signature";

    /** How old a timestamp may be (or how far in the future) before a message counts as replayed. */
    public static final Duration TOLERANCE = Duration.ofMinutes(5);

    private static final String SECRET_PREFIX = "whsec_";
    private static final String VERSION = "v1";
    private static final SecureRandom RANDOM = new SecureRandom();

    private WebhookSignature() {
    }

    /** A new {@code whsec_} secret with 32 random bytes. */
    public static String newSecret() {
        byte[] key = new byte[32];
        RANDOM.nextBytes(key);
        return SECRET_PREFIX + Base64.getEncoder().encodeToString(key);
    }

    /** @return the {@code webhook-signature} header value */
    public static String sign(String secret, String messageId, long timestamp, String body) {
        return VERSION + "," + Base64.getEncoder().encodeToString(hmac(secret, messageId, timestamp, body));
    }

    /**
     * @param signatureHeader one or more space-separated {@code v1,<base64>} signatures
     * @return true when one of them matches and the timestamp is within {@link #TOLERANCE} of {@code now}
     */
    public static boolean verify(String secret, String messageId, String timestamp, String signatureHeader,
                                 String body, Instant now) {
        if (secret == null || messageId == null || timestamp == null || signatureHeader == null || body == null) {
            return false;
        }
        long seconds;
        try {
            seconds = Long.parseLong(timestamp);
        } catch (NumberFormatException e) {
            return false;
        }
        if (Math.abs(now.getEpochSecond() - seconds) > TOLERANCE.toSeconds()) {
            return false;
        }
        byte[] expected = hmac(secret, messageId, seconds, body);
        for (String candidate : signatureHeader.trim().split(" +")) {
            int comma = candidate.indexOf(',');
            if (comma < 0 || !VERSION.equals(candidate.substring(0, comma))) {
                continue;
            }
            byte[] given;
            try {
                given = Base64.getDecoder().decode(candidate.substring(comma + 1));
            } catch (IllegalArgumentException e) {
                continue;
            }
            if (MessageDigest.isEqual(expected, given)) {
                return true;
            }
        }
        return false;
    }

    private static byte[] hmac(String secret, String messageId, long timestamp, String body) {
        String encodedKey = secret.startsWith(SECRET_PREFIX) ? secret.substring(SECRET_PREFIX.length()) : secret;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(Base64.getDecoder().decode(encodedKey), "HmacSHA256"));
            return mac.doFinal((messageId + "." + timestamp + "." + body).getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 is not available", e);
        }
    }
}
