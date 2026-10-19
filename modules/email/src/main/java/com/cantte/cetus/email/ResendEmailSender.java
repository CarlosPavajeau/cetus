package com.cantte.cetus.email;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.core.net.RequestOptions;
import com.resend.services.emails.model.Attachment;
import com.resend.services.emails.model.CreateEmailOptions;

import java.io.IOException;
import java.time.Duration;
import java.util.Base64;

/**
 * {@link EmailSender} on the official Resend SDK. One instance per API key: the SDK client and its
 * connection pool are shared by every send.
 */
public final class ResendEmailSender implements EmailSender {

    private static final int TOO_MANY_REQUESTS = 429;
    /** Resend's answer to two concurrent requests with the same idempotency key. */
    private static final int CONFLICT = 409;

    private final Resend resend;

    public ResendEmailSender(String apiKey, String baseUrl, Duration connectTimeout, Duration readTimeout) {
        this.resend = Resend.builder()
                .apiKey(apiKey)
                .baseUrl(baseUrl)
                .connectTimeout(connectTimeout)
                .readTimeout(readTimeout)
                .build();
    }

    @Override
    public String send(EmailMessage message, String idempotencyKey) {
        CreateEmailOptions.Builder email = CreateEmailOptions.builder()
                .from(message.from())
                .to(message.to())
                .subject(message.subject())
                .html(message.html())
                .text(message.text());
        if (message.replyTo() != null) {
            email.replyTo(message.replyTo());
        }
        for (EmailMessage.Attachment attachment : message.attachments()) {
            email.addAttachment(Attachment.builder()
                    .fileName(attachment.fileName())
                    .content(Base64.getEncoder().encodeToString(attachment.content()))
                    .build());
        }
        RequestOptions options = RequestOptions.builder().setIdempotencyKey(idempotencyKey).build();
        try {
            return resend.emails().send(email.build(), options).getId();
        } catch (ResendException e) {
            throw translate(e);
        } catch (RuntimeException e) {
            // The SDK wraps network errors and timeouts in a RuntimeException around the IOException.
            if (e.getCause() instanceof IOException) {
                throw new EmailTransientException("Resend unreachable: " + e.getCause().getMessage(), e);
            }
            throw e;
        }
    }

    private static EmailException translate(ResendException e) {
        Integer status = e.getStatusCode();
        String detail = "Resend " + (status == null ? "error" : status)
                + (e.getErrorName() == null ? "" : " " + e.getErrorName()) + ": " + e.getMessage();
        if (status == null || status >= 500 || status == CONFLICT) {
            return new EmailTransientException(detail, e);
        }
        if (status == TOO_MANY_REQUESTS) {
            return new EmailRateLimited(detail, e);
        }
        return new EmailRejectedException(detail, e);
    }
}
