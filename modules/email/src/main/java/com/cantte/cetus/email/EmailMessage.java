package com.cantte.cetus.email;

import java.util.List;

/**
 * @param replyTo null to reply to the sender
 */
public record EmailMessage(
        String from,
        String to,
        String replyTo,
        String subject,
        String html,
        String text,
        List<Attachment> attachments) {

    public EmailMessage {
        attachments = attachments == null ? List.of() : List.copyOf(attachments);
    }

    public record Attachment(String fileName, byte[] content) {}
}
