package com.cantte.cetus.email;

import com.resend.core.exception.ResendException;
import com.resend.services.webhooks.Webhooks;
import com.resend.services.webhooks.model.VerifyWebhookOptions;

import java.util.Map;

/**
 * Checks the Svix signature Resend puts on its webhooks (HMAC-SHA256 with the endpoint secret, and a
 * timestamp no older than five minutes), so forged or replayed events are rejected.
 */
public final class ResendWebhookVerifier {

    /** Verifying makes no API call, so the SDK service needs no real API key. */
    private static final String NO_API_KEY = "re_verify_only";

    private final Webhooks webhooks = new Webhooks(NO_API_KEY);
    private final String secret;

    /** @param secret the endpoint's signing secret ({@code whsec_...}) */
    public ResendWebhookVerifier(String secret) {
        this.secret = secret;
    }

    /** @return true when the body was signed with the secret and is recent enough */
    public boolean verify(String svixId, String svixTimestamp, String svixSignature, String body) {
        if (svixId == null || svixTimestamp == null || svixSignature == null || body == null) {
            return false;
        }
        try {
            webhooks.verify(VerifyWebhookOptions.builder()
                    .payload(body)
                    .addHeaders(Map.of("svix-id", svixId, "svix-timestamp", svixTimestamp, "svix-signature", svixSignature))
                    .secret(secret)
                    .build());
            return true;
        } catch (ResendException | IllegalArgumentException e) {
            // IllegalArgumentException: a secret that is not valid base64.
            return false;
        }
    }
}
