package com.cantte.cetus.api.help;

import com.cantte.cetus.api.admin.PlatformRoles;
import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.api.help.HelpViews.AdminAttachmentView;
import com.cantte.cetus.api.help.HelpViews.AdminTicketDetailView;
import com.cantte.cetus.api.help.HelpViews.AdminTicketPage;
import com.cantte.cetus.api.help.HelpViews.AdminTicketSummaryView;
import com.cantte.cetus.api.help.HelpViews.ChangeTicketStatusRequest;
import com.cantte.cetus.api.help.HelpViews.FeedbackPage;
import com.cantte.cetus.api.help.HelpViews.FeedbackView;
import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.FeedbackEntity;
import com.cantte.cetus.persistence.entity.SupportAttachmentEntity;
import com.cantte.cetus.persistence.entity.SupportTicketEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.time.Duration;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/** Every account's support tickets and feedback, for the Cetus team; the replies go by email. */
@Path("/admin")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({PlatformRoles.ADMIN, PlatformRoles.SUPPORT})
@APIResponse(
        responseCode = "403",
        description = "Forbidden",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "404",
        description = "Not Found",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class AdminSupportResource {

    static final int MAX_PAGE_SIZE = 100;
    static final Duration DOWNLOAD_TTL = Duration.ofMinutes(15);

    @Inject
    ConsoleContext context;

    @Inject
    SupportTickets tickets;

    @Inject
    DocumentStorage storage;

    @Inject
    AuditLog auditLog;

    @Inject
    RequestOriginResolver origin;

    /** Newest first, optionally in one status: pass the previous page's {@code nextCursor} as {@code before}. */
    @GET
    @Path("/support-tickets")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public AdminTicketPage list(
            @QueryParam("status") SupportTicketEntity.Status status,
            @QueryParam("before") UUID before,
            @QueryParam("limit") @DefaultValue("50") int limit) {
        int size = Math.clamp(limit, 1, MAX_PAGE_SIZE);
        List<SupportTicketEntity> rows = SupportTicketEntity.page(status, before, size + 1);
        List<SupportTicketEntity> items = rows.subList(0, Math.min(rows.size(), size));
        Map<UUID, String> names =
                accountNames(items.stream().map(ticket -> ticket.accountId).collect(Collectors.toSet()));
        Map<UUID, Long> attachments =
                attachmentCounts(items.stream().map(ticket -> ticket.id).toList());
        return new AdminTicketPage(
                items.stream()
                        .map(ticket -> new AdminTicketSummaryView(
                                ticket.id,
                                ticket.number,
                                ticket.accountId,
                                names.get(ticket.accountId),
                                ticket.userEmail,
                                ticket.priority,
                                ticket.status,
                                ticket.message,
                                attachments.getOrDefault(ticket.id, 0L).intValue(),
                                ticket.createdAt,
                                ticket.updatedAt))
                        .toList(),
                rows.size() > size ? items.getLast().id : null);
    }

    @GET
    @Path("/support-tickets/{id}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public AdminTicketDetailView get(@PathParam("id") UUID id) {
        SupportTicketEntity ticket = SupportTicketEntity.<SupportTicketEntity>findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("Ticket not found"));
        return detail(ticket);
    }

    @PUT
    @Path("/support-tickets/{id}/status")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public AdminTicketDetailView changeStatus(
            @PathParam("id") UUID id, @Valid @NotNull ChangeTicketStatusRequest request) {
        SupportTicketEntity ticket = SupportTicketEntity.<SupportTicketEntity>findByIdOptional(
                        id, LockModeType.PESSIMISTIC_WRITE)
                .orElseThrow(() -> new NotFoundException("Ticket not found"));
        if (ticket.status != request.status()) {
            SupportTicketEntity.Status previous = ticket.status;
            ticket.status = request.status();
            auditLog.record(
                    ticket.accountId,
                    context.platformActor(),
                    origin.resolve(),
                    AuditAction.SUPPORT_TICKET_STATUS_CHANGED,
                    "support_ticket",
                    ticket.id,
                    Map.of("number", ticket.number, "status", ticket.status, "statusPrevious", previous));
        }
        return detail(ticket);
    }

    /** Newest first: pass the previous page's {@code nextCursor} as {@code before}. */
    @GET
    @Path("/feedback")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public FeedbackPage feedback(
            @QueryParam("before") UUID before, @QueryParam("limit") @DefaultValue("50") int limit) {
        int size = Math.clamp(limit, 1, MAX_PAGE_SIZE);
        List<FeedbackEntity> rows = FeedbackEntity.page(before, size + 1);
        List<FeedbackEntity> items = rows.subList(0, Math.min(rows.size(), size));
        Map<UUID, String> names =
                accountNames(items.stream().map(each -> each.accountId).collect(Collectors.toSet()));
        return new FeedbackPage(
                items.stream()
                        .map(each -> FeedbackView.from(each, names.get(each.accountId)))
                        .toList(),
                rows.size() > size ? items.getLast().id : null);
    }

    private AdminTicketDetailView detail(SupportTicketEntity ticket) {
        AccountEntity account = AccountEntity.findById(ticket.accountId);
        List<AdminAttachmentView> attachments = SupportAttachmentEntity.listByTicket(ticket.id).stream()
                .map(attachment -> new AdminAttachmentView(
                        attachment.id,
                        attachment.fileName,
                        attachment.contentType,
                        attachment.size,
                        storage.presignGet(attachment.storageKey, DOWNLOAD_TTL, attachment.fileName)
                                .url()))
                .toList();
        return new AdminTicketDetailView(
                ticket.id,
                ticket.number,
                ticket.accountId,
                account.name,
                ticket.userId,
                ticket.userEmail,
                ticket.priority,
                ticket.status,
                ticket.message,
                tickets.readSnapshot(ticket),
                attachments,
                ticket.createdAt,
                ticket.updatedAt);
    }

    private static Map<UUID, String> accountNames(Set<UUID> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return AccountEntity.<AccountEntity>list("id in ?1", ids).stream()
                .collect(Collectors.toMap(account -> account.id, account -> account.name));
    }

    private static Map<UUID, Long> attachmentCounts(Collection<UUID> ticketIds) {
        if (ticketIds.isEmpty()) {
            return Map.of();
        }
        return SupportAttachmentEntity.<SupportAttachmentEntity>list("ticketId in ?1", ticketIds).stream()
                .collect(Collectors.groupingBy(attachment -> attachment.ticketId, Collectors.counting()));
    }
}
