package com.cantte.cetus.email;

import com.resend.Resend;
import com.resend.core.net.RequestOptions;
import com.resend.services.emails.model.Attachment;
import com.resend.services.emails.model.CreateEmailOptions;
import java.time.Duration;
import java.util.Base64;

/**
 * {@link EmailSender} on the official Resend SDK. One instance per API key: the SDK client and its
 * connection pool are shared by every send.
 */
public final class ResendEmailSender implements EmailSender {

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
        RequestOptions options =
                RequestOptions.builder().setIdempotencyKey(idempotencyKey).build();
        return ResendErrors.call(
                () -> resend.emails().send(email.build(), options).getId());
    }
}
