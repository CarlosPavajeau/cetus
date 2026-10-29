package com.cantte.cetus.api.help;

import com.cantte.cetus.api.console.ConsoleContext;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.api.help.HelpViews.AttachmentView;
import com.cantte.cetus.api.help.HelpViews.CreateTicketRequest;
import com.cantte.cetus.api.help.HelpViews.FeedbackRequest;
import com.cantte.cetus.api.help.HelpViews.SupportTicketPage;
import com.cantte.cetus.api.help.HelpViews.SupportTicketView;
import com.cantte.cetus.api.help.HelpViews.UploadAttachmentRequest;
import com.cantte.cetus.persistence.entity.SupportAttachmentEntity;
import com.cantte.cetus.persistence.entity.SupportTicketEntity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * The console's help page: tickets to the Cetus team, the files attached to them and feedback. Every member
 * can open tickets and sees the organization's; a suspended account still can, since that is when it needs
 * help most.
 */
@Path("/console")
@Produces(MediaType.APPLICATION_JSON)
@APIResponse(
        responseCode = "400",
        description = "Bad Request",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "404",
        description = "Not Found",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "422",
        description = "Unprocessable Entity",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
@APIResponse(
        responseCode = "429",
        description = "Too Many Requests",
        content =
                @Content(mediaType = ProblemDetail.MEDIA_TYPE, schema = @Schema(implementation = ProblemDetail.class)))
public class SupportTicketResource {

    static final int MAX_PAGE_SIZE = 50;

    @Inject
    ConsoleContext context;

    @Inject
    SupportTickets tickets;

    /** Newest first: pass the previous page's {@code nextCursor} as {@code before}. */
    @GET
    @Path("/support-tickets")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public SupportTicketPage list(
            @QueryParam("before") UUID before, @QueryParam("limit") @DefaultValue("20") int limit) {
        int size = Math.clamp(limit, 1, MAX_PAGE_SIZE);
        List<SupportTicketEntity> rows = SupportTicketEntity.pageByAccount(context.accountId(), before, size + 1);
        List<SupportTicketEntity> items = rows.subList(0, Math.min(rows.size(), size));
        UUID nextCursor = rows.size() > size ? items.getLast().id : null;
        Map<UUID, List<SupportAttachmentEntity>> attachments =
                SupportAttachmentEntity.listByTickets(
                                items.stream().map(ticket -> ticket.id).toList())
                        .stream()
                        .collect(Collectors.groupingBy(attachment -> attachment.ticketId));
        return new SupportTicketPage(
                items.stream()
                        .map(ticket -> SupportTicketView.from(ticket, attachments.getOrDefault(ticket.id, List.of())))
                        .toList(),
                nextCursor);
    }

    @POST
    @Path("/support-tickets")
    @Transactional
    @APIResponse(
            responseCode = "201",
            description = "Created",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_JSON,
                            schema = @Schema(implementation = SupportTicketView.class)))
    public Response create(@Valid @NotNull CreateTicketRequest request) {
        SupportTicketEntity ticket = tickets.create(request);
        return Response.status(201)
                .entity(SupportTicketView.from(ticket, SupportAttachmentEntity.listByTicket(ticket.id)))
                .build();
    }

    /** One file per request, uploaded while the ticket is written; the ticket then names it in attachmentIds. */
    @POST
    @Path("/support-attachments")
    @Transactional
    @APIResponse(
            responseCode = "201",
            description = "Created",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_JSON,
                            schema = @Schema(implementation = AttachmentView.class)))
    public Response upload(@Valid @NotNull UploadAttachmentRequest request) {
        return Response.status(201)
                .entity(AttachmentView.from(tickets.upload(request)))
                .build();
    }

    @POST
    @Path("/feedback")
    @Transactional
    @APIResponse(responseCode = "204", description = "No Content")
    public Response feedback(@Valid @NotNull FeedbackRequest request) {
        tickets.feedback(request);
        return Response.noContent().build();
    }
}
