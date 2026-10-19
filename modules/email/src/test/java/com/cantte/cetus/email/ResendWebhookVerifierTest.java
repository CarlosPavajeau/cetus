package com.cantte.cetus.email;

import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class ResendWebhookVerifierTest {

    private static final byte[] KEY = "a-test-signing-key-of-32-bytes!!".getBytes(StandardCharsets.UTF_8);
    private static final String SECRET = "whsec_" + Base64.getEncoder().encodeToString(KEY);
    private static final String BODY = "{\"type\":\"email.delivered\",\"data\":{\"email_id\":\"email-123\"}}";

    private final ResendWebhookVerifier verifier = new ResendWebhookVerifier(SECRET);

    @Test
    void acceptsAnEventSignedWithTheSecret() {
        String timestamp = now();
        assertThat(verifier.verify("msg_1", timestamp, "v1," + sign("msg_1", timestamp, BODY), BODY)).isTrue();
    }

    @Test
    void acceptsAnyOfSeveralSignatures() {
        String timestamp = now();
        String header = "v1,bm90LXRoaXMtb25l v1," + sign("msg_1", timestamp, BODY);
        assertThat(verifier.verify("msg_1", timestamp, header, BODY)).isTrue();
    }

    @Test
    void rejectsATamperedBody() {
        String timestamp = now();
        String signature = "v1," + sign("msg_1", timestamp, BODY);
        assertThat(verifier.verify("msg_1", timestamp, signature, BODY.replace("delivered", "bounced"))).isFalse();
    }

    @Test
    void rejectsAnOldEvent() {
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000 - 600);
        assertThat(verifier.verify("msg_1", timestamp, "v1," + sign("msg_1", timestamp, BODY), BODY)).isFalse();
    }

    @Test
    void rejectsMissingHeadersAndAnotherSecret() {
        String timestamp = now();
        String signature = "v1," + sign("msg_1", timestamp, BODY);
        assertThat(verifier.verify(null, timestamp, signature, BODY)).isFalse();
        String otherSecret = "whsec_" + Base64.getEncoder().encodeToString("another-key".getBytes(StandardCharsets.UTF_8));
        assertThat(new ResendWebhookVerifier(otherSecret).verify("msg_1", timestamp, signature, BODY)).isFalse();
        assertThat(new ResendWebhookVerifier("whsec_not base64!").verify("msg_1", timestamp, signature, BODY)).isFalse();
    }

    /** What Resend (Svix) computes: base64(HMAC-SHA256(key, id + "." + timestamp + "." + body)). */
    static String sign(String id, String timestamp, String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(KEY, "HmacSHA256"));
            return Base64.getEncoder().encodeToString(
                    mac.doFinal((id + "." + timestamp + "." + body).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String now() {
        return String.valueOf(System.currentTimeMillis() / 1000);
    }
}
