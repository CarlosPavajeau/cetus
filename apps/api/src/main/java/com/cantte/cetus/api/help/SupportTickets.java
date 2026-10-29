package com.cantte.cetus.api.help;

import com.cantte.cetus.api.admin.AdminAccountQueries;
import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.console.IssuerViews.IssuerDetailView;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.api.help.HelpViews.AccountSnapshot;
import com.cantte.cetus.api.help.HelpViews.CreateTicketRequest;
import com.cantte.cetus.api.help.HelpViews.FeedbackRequest;
import com.cantte.cetus.api.help.HelpViews.SupportSnapshot;
import com.cantte.cetus.api.help.HelpViews.UploadAttachmentRequest;
import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.FeedbackEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.SupportAttachmentEntity;
import com.cantte.cetus.persistence.entity.SupportTicketEntity;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;

/**
 * Help requests from the console. A ticket keeps a snapshot of the account and, when it names one, of the
 * issuer, so the Cetus team sees the state the person saw without asking; the worker emails it to the
 * support mailbox with the person as Reply-To, and the conversation goes on by email.
 */
@ApplicationScoped
public class SupportTickets {

    static final Duration WINDOW = Duration.ofHours(1);
    static final int TICKETS_PER_WINDOW = 5;
    static final int FEEDBACK_PER_WINDOW = 10;
    static final int RECENT_FAILURES = 5;

    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {};

    @Inject
    ConsoleContext context;

    @Inject
    AdminAccountQueries queries;

    @Inject
    DocumentStorage storage;

    @Inject
    JobQueue jobs;

    @Inject
    AuditLog auditLog;

    @Inject
    RequestOriginResolver origin;

    @Inject
    ObjectMapper mapper;

    @Transactional(Transactional.TxType.MANDATORY)
    public SupportAttachmentEntity upload(UploadAttachmentRequest request) {
        byte[] content;
        try {
            content = Base64.getDecoder().decode(request.contentBase64());
        } catch (IllegalArgumentException e) {
            throw new DomainException("attachment_invalid", "The attachment is not valid base64");
        }
        if (content.length == 0 || content.length > HelpViews.MAX_ATTACHMENT_BYTES) {
            throw new DomainException("attachment_too_large", "An attachment holds up to 5 MB");
        }
        String contentType = AttachmentTypes.detect(content)
                .orElseThrow(() -> new DomainException(
                        "attachment_type_unsupported", "Attach JPEG, PNG, GIF or WebP images, or PDF files"));
        SupportAttachmentEntity attachment = new SupportAttachmentEntity();
        attachment.id = Ids.newId();
        attachment.accountId = context.accountId();
        attachment.fileName = request.fileName().strip();
        attachment.contentType = contentType;
        attachment.size = content.length;
        attachment.storageKey = "support/" + attachment.accountId + "/" + attachment.id;
        attachment.createdAt = OffsetDateTime.now();
        storage.put(attachment.storageKey, content, contentType);
        attachment.persist();
        return attachment;
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public SupportTicketEntity create(CreateTicketRequest request) {
        AccountEntity account = context.account();
        checkNotTooMany(SupportTicketEntity.countByUserSince(context.userId(), windowStart()), TICKETS_PER_WINDOW);
        IssuerEntity issuer = request.issuerId() == null
                ? null
                : IssuerEntity.findForAccount(account.id, request.issuerId())
                        .orElseThrow(() -> new NotFoundException("Issuer not found"));
        List<SupportAttachmentEntity> attachments = attachments(account, request);

        SupportTicketEntity ticket = new SupportTicketEntity();
        ticket.id = Ids.newId();
        ticket.number = SupportTicketEntity.nextNumber();
        ticket.accountId = account.id;
        ticket.userId = context.userId();
        ticket.userEmail = email();
        ticket.issuerId = issuer == null ? null : issuer.id;
        ticket.priority = request.priority();
        ticket.message = request.message().strip();
        ticket.context = mapper.convertValue(snapshot(account, issuer, request), MAP);
        ticket.createdAt = OffsetDateTime.now();
        ticket.persist();
        attachments.forEach(attachment -> attachment.ticketId = ticket.id);

        auditLog.record(
                account.id,
                context.actor(),
                origin.resolve(),
                AuditAction.SUPPORT_TICKET_CREATED,
                "support_ticket",
                ticket.id,
                Map.of("number", ticket.number, "priority", ticket.priority));
        jobs.enqueue(JobTypes.SEND_SUPPORT_TICKET, ticket.id);
        return ticket;
    }

    @Transactional(Transactional.TxType.MANDATORY)
    public FeedbackEntity feedback(FeedbackRequest request) {
        checkNotTooMany(FeedbackEntity.countByUserSince(context.userId(), windowStart()), FEEDBACK_PER_WINDOW);
        FeedbackEntity feedback = new FeedbackEntity();
        feedback.id = Ids.newId();
        feedback.accountId = context.accountId();
        feedback.userId = context.userId();
        feedback.userEmail = email();
        feedback.message = request.message().strip();
        feedback.page = request.page();
        feedback.createdAt = OffsetDateTime.now();
        feedback.persist();
        jobs.enqueue(JobTypes.SEND_FEEDBACK, feedback.id);
        return feedback;
    }

    public SupportSnapshot readSnapshot(SupportTicketEntity ticket) {
        return mapper.convertValue(ticket.context, SupportSnapshot.class);
    }

    private SupportSnapshot snapshot(AccountEntity account, IssuerEntity issuer, CreateTicketRequest request) {
        Environment environment = issuer == null ? request.environment() : issuer.environment;
        return new SupportSnapshot(
                OffsetDateTime.now(),
                AccountSnapshot.from(account),
                environment,
                context.organizationRoles().stream().sorted().toList(),
                request.page(),
                issuer == null ? null : IssuerDetailView.from(issuer),
                issuer == null ? List.of() : queries.recentFailures(account.id, issuer.id, RECENT_FAILURES));
    }

    private static List<SupportAttachmentEntity> attachments(AccountEntity account, CreateTicketRequest request) {
        if (request.attachmentIds() == null || request.attachmentIds().isEmpty()) {
            return List.of();
        }
        Set<UUID> ids = new HashSet<>(request.attachmentIds());
        List<SupportAttachmentEntity> found = SupportAttachmentEntity.lockUnlinked(account.id, ids);
        if (found.size() != ids.size()) {
            throw new DomainException(
                    "attachment_not_found", "An attachment was not uploaded by this account or is already sent");
        }
        return found;
    }

    private String email() {
        return context.email()
                .orElseThrow(() -> new DomainException("email_required", "The session has no email address"));
    }

    private static OffsetDateTime windowStart() {
        return OffsetDateTime.now().minus(WINDOW);
    }

    private static void checkNotTooMany(long count, int limit) {
        if (count >= limit) {
            throw new TooMany();
        }
    }

    /** 429 once a person sent the hour's share; the window slides, so a retry after a while goes through. */
    public static class TooMany extends WebApplicationException {

        TooMany() {
            super(ProblemDetail.builder(429, "support_too_many", "Too many requests in the last hour")
                    .header("Retry-After", Duration.ofMinutes(10).toSeconds())
                    .build());
        }
    }

    /** The types the support mailbox can open, recognized by their first bytes rather than the file name. */
    static final class AttachmentTypes {

        private AttachmentTypes() {}

        static Optional<String> detect(byte[] content) {
            if (startsWith(content, 0, 0xFF, 0xD8, 0xFF)) {
                return Optional.of("image/jpeg");
            }
            if (startsWith(content, 0, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)) {
                return Optional.of("image/png");
            }
            if (startsWith(content, 0, 'G', 'I', 'F', '8', '7', 'a')
                    || startsWith(content, 0, 'G', 'I', 'F', '8', '9', 'a')) {
                return Optional.of("image/gif");
            }
            if (startsWith(content, 0, 'R', 'I', 'F', 'F') && startsWith(content, 8, 'W', 'E', 'B', 'P')) {
                return Optional.of("image/webp");
            }
            if (startsWith(content, 0, '%', 'P', 'D', 'F', '-')) {
                return Optional.of("application/pdf");
            }
            return Optional.empty();
        }

        private static boolean startsWith(byte[] content, int offset, int... prefix) {
            if (content.length < offset + prefix.length) {
                return false;
            }
            return IntStream.range(0, prefix.length).allMatch(i -> (content[offset + i] & 0xFF) == prefix[i]);
        }
    }
}
