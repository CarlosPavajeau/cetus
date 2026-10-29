package com.cantte.cetus.worker.support;

import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.FeedbackEntity;
import com.cantte.cetus.persistence.entity.SupportAttachmentEntity;
import com.cantte.cetus.persistence.entity.SupportTicketEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Reads a support ticket or a feedback in a short transaction, to email it outside of one. */
@ApplicationScoped
public class SupportRecorder {

    @Inject
    ObjectMapper mapper;

    public record Ticket(
            UUID id,
            long number,
            String accountName,
            String userEmail,
            SupportTicketEntity.Priority priority,
            String message,
            /** The snapshot of the account and issuer, as indented JSON. */
            String context,
            List<Attachment> attachments,
            OffsetDateTime createdAt) {}

    public record Attachment(String fileName, String storageKey) {}

    public record Feedback(UUID id, String accountName, String userEmail, String message, String page) {}

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public Optional<Ticket> ticket(UUID id) {
        return SupportTicketEntity.<SupportTicketEntity>findByIdOptional(id)
                .map(ticket -> new Ticket(
                        ticket.id,
                        ticket.number,
                        AccountEntity.<AccountEntity>findById(ticket.accountId).name,
                        ticket.userEmail,
                        ticket.priority,
                        ticket.message,
                        json(ticket.context),
                        SupportAttachmentEntity.listByTicket(ticket.id).stream()
                                .map(attachment -> new Attachment(attachment.fileName, attachment.storageKey))
                                .toList(),
                        ticket.createdAt));
    }

    private String json(Map<String, Object> context) {
        try {
            return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(context);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Corrupt support ticket context", e);
        }
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public Optional<Feedback> feedback(UUID id) {
        return FeedbackEntity.<FeedbackEntity>findByIdOptional(id)
                .map(feedback -> new Feedback(
                        feedback.id,
                        AccountEntity.<AccountEntity>findById(feedback.accountId).name,
                        feedback.userEmail,
                        feedback.message,
                        feedback.page));
    }
}
