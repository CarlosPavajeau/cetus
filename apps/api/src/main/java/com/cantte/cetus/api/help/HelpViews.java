package com.cantte.cetus.api.help;

import com.cantte.cetus.api.admin.AdminViews.FailedDocumentView;
import com.cantte.cetus.api.console.IssuerViews.IssuerDetailView;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.FeedbackEntity;
import com.cantte.cetus.persistence.entity.SupportAttachmentEntity;
import com.cantte.cetus.persistence.entity.SupportTicketEntity;
import com.cantte.cetus.persistence.entity.SupportTicketEntity.Priority;
import com.cantte.cetus.persistence.entity.SupportTicketEntity.Status;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public final class HelpViews {

    private HelpViews() {}

    static final int MAX_TICKET_MESSAGE = 5_000;
    static final int MAX_FEEDBACK_MESSAGE = 2_000;
    static final int MAX_ATTACHMENTS = 5;
    static final int MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
    /** Base64 of {@link #MAX_ATTACHMENT_BYTES}, rounded up to whole 4-character groups. */
    static final int MAX_ATTACHMENT_BASE64 = (MAX_ATTACHMENT_BYTES + 2) / 3 * 4;
    /** A console path such as /setup?step=2: one line, no control characters. */
    static final String PAGE = "/[^\\p{Cntrl}]*";
    /** A file name without folders or control characters: it becomes an email attachment's name. */
    static final String FILE_NAME = "[^/\\\\\\p{Cntrl}]+";

    public record CreateTicketRequest(
            @NotBlank @Size(max = MAX_TICKET_MESSAGE) String message,
            @NotNull Priority priority,

            @Schema(nullable = true, description = "The issuer the ticket is about; its state goes with the ticket")
            UUID issuerId,

            @Schema(nullable = true, description = "The environment the console showed, when no issuer is named")
            Environment environment,

            @Size(max = 300) @Pattern(regexp = PAGE) String page,
            @Size(max = MAX_ATTACHMENTS) List<@NotNull UUID> attachmentIds) {}

    public record UploadAttachmentRequest(
            @NotBlank @Size(max = 200) @Pattern(regexp = FILE_NAME)
            String fileName,

            @NotBlank @Size(max = MAX_ATTACHMENT_BASE64) String contentBase64) {}

    public record FeedbackRequest(
            @NotBlank @Size(max = MAX_FEEDBACK_MESSAGE) String message,
            @Size(max = 300) @Pattern(regexp = PAGE) String page) {}

    public record ChangeTicketStatusRequest(@NotNull Status status) {}

    public record AttachmentView(UUID id, String fileName, String contentType, int size) {
        static AttachmentView from(SupportAttachmentEntity attachment) {
            return new AttachmentView(attachment.id, attachment.fileName, attachment.contentType, attachment.size);
        }
    }

    public record SupportTicketView(
            UUID id,
            long number,
            Priority priority,
            Status status,
            String message,
            String userEmail,
            @Schema(nullable = true) UUID issuerId,
            List<AttachmentView> attachments,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {
        static SupportTicketView from(SupportTicketEntity ticket, List<SupportAttachmentEntity> attachments) {
            return new SupportTicketView(
                    ticket.id,
                    ticket.number,
                    ticket.priority,
                    ticket.status,
                    ticket.message,
                    ticket.userEmail,
                    ticket.issuerId,
                    attachments.stream().map(AttachmentView::from).toList(),
                    ticket.createdAt,
                    ticket.updatedAt);
        }
    }

    public record SupportTicketPage(
            List<SupportTicketView> items,
            @Schema(nullable = true) UUID nextCursor) {}

    /** What the Cetus team sees of the account and issuer as they were when the ticket was opened. */
    public record SupportSnapshot(
            OffsetDateTime takenAt,
            AccountSnapshot account,
            @Schema(nullable = true) Environment environment,
            List<String> organizationRoles,
            @Schema(nullable = true) String page,
            @Schema(nullable = true) IssuerDetailView issuer,

            @Schema(description = "The issuer's latest rejected or failed documents; empty without an issuer")
            List<FailedDocumentView> recentFailures) {}

    public record AccountSnapshot(
            UUID id, String organizationId, String name, AccountEntity.Status status, String plan) {
        static AccountSnapshot from(AccountEntity account) {
            return new AccountSnapshot(account.id, account.organizationId, account.name, account.status, account.plan);
        }
    }

    public record AdminTicketSummaryView(
            UUID id,
            long number,
            UUID accountId,
            String accountName,
            String userEmail,
            Priority priority,
            Status status,
            String message,
            int attachmentCount,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {}

    public record AdminTicketPage(
            List<AdminTicketSummaryView> items,
            @Schema(nullable = true) UUID nextCursor) {}

    public record AdminAttachmentView(
            UUID id,
            String fileName,
            String contentType,
            int size,

            @Schema(description = "Presigned download link, valid for a few minutes")
            String url) {}

    public record AdminTicketDetailView(
            UUID id,
            long number,
            UUID accountId,
            String accountName,
            String userId,
            String userEmail,
            Priority priority,
            Status status,
            String message,
            SupportSnapshot context,
            List<AdminAttachmentView> attachments,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {}

    public record FeedbackView(
            UUID id,
            UUID accountId,
            String accountName,
            String userEmail,
            String message,
            @Schema(nullable = true) String page,
            OffsetDateTime createdAt) {
        static FeedbackView from(FeedbackEntity feedback, String accountName) {
            return new FeedbackView(
                    feedback.id,
                    feedback.accountId,
                    accountName,
                    feedback.userEmail,
                    feedback.message,
                    feedback.page,
                    feedback.createdAt);
        }
    }

    public record FeedbackPage(
            List<FeedbackView> items,
            @Schema(nullable = true) UUID nextCursor) {}
}
