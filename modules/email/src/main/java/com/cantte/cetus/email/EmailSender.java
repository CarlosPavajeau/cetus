package com.cantte.cetus.email;

/** Sends one email. Implementations hide the provider; callers only see the exceptions declared here. */
public interface EmailSender {

    /**
     * @param idempotencyKey same key on every retry of the same delivery, so the provider sends it once
     * @return the provider's id for the email, used to match its delivery events
     * @throws EmailRateLimited        the provider asks to slow down; try again later
     * @throws EmailTransientException network error, timeout or provider failure; safe to retry
     * @throws EmailRejectedException  the provider refused the message itself; retrying will not help
     */
    String send(EmailMessage message, String idempotencyKey);
}
