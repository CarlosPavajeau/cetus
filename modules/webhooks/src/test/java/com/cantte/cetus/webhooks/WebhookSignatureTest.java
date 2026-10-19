package com.cantte.cetus.webhooks;

import com.cantte.cetus.email.ResendWebhookVerifier;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class WebhookSignatureTest {

    private static final String BODY = "{\"id\":\"evt_1\",\"type\":\"invoice.accepted\"}";

    private final String secret = WebhookSignature.newSecret();
    private final Instant now = Instant.now();
    private final String timestamp = Long.toString(now.getEpochSecond());

    @Test
    void newSecretsAreWhsecWith32RandomBytes() {
        assertThat(secret).startsWith("whsec_");
        assertThat(java.util.Base64.getDecoder().decode(secret.substring(6))).hasSize(32);
        assertThat(WebhookSignature.newSecret()).isNotEqualTo(secret);
    }

    @Test
    void verifiesItsOwnSignature() {
        String signature = WebhookSignature.sign(secret, "evt_1", now.getEpochSecond(), BODY);
        assertThat(signature).startsWith("v1,");
        assertThat(WebhookSignature.verify(secret, "evt_1", timestamp, signature, BODY, now)).isTrue();
    }

    @Test
    void rejectsATamperedBodyAnotherIdOrAnotherSecret() {
        String signature = WebhookSignature.sign(secret, "evt_1", now.getEpochSecond(), BODY);
        assertThat(WebhookSignature.verify(secret, "evt_1", timestamp, signature, BODY.replace("accepted", "rejected"), now)).isFalse();
        assertThat(WebhookSignature.verify(secret, "evt_2", timestamp, signature, BODY, now)).isFalse();
        assertThat(WebhookSignature.verify(WebhookSignature.newSecret(), "evt_1", timestamp, signature, BODY, now)).isFalse();
    }

    @Test
    void rejectsAReplayedTimestamp() {
        long old = now.minusSeconds(600).getEpochSecond();
        String signature = WebhookSignature.sign(secret, "evt_1", old, BODY);
        assertThat(WebhookSignature.verify(secret, "evt_1", Long.toString(old), signature, BODY, now)).isFalse();
    }

    @Test
    void acceptsAnyOfSeveralSignaturesDuringARotation() {
        String header = "v1,bm90LXRoaXMtb25l " + WebhookSignature.sign(secret, "evt_1", now.getEpochSecond(), BODY);
        assertThat(WebhookSignature.verify(secret, "evt_1", timestamp, header, BODY, now)).isTrue();
    }

    /** Svix implements the same scheme, so any Standard Webhooks verifier accepts our signatures. */
    @Test
    void interoperatesWithTheSvixVerifier() {
        String signature = WebhookSignature.sign(secret, "evt_1", now.getEpochSecond(), BODY);
        assertThat(new ResendWebhookVerifier(secret).verify("evt_1", timestamp, signature, BODY)).isTrue();
    }
}
