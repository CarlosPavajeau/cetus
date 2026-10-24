package com.cantte.cetus.api.console;

import com.cantte.cetus.api.audit.RequestOriginResolver;
import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.aws.SecretCipher;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.WebhookDeliveryEntity;
import com.cantte.cetus.persistence.entity.WebhookEndpointEntity;
import com.cantte.cetus.persistence.entity.WebhookEventEntity;
import com.cantte.cetus.webhooks.WebhookEventType;
import com.cantte.cetus.webhooks.WebhookSignature;
import com.cantte.cetus.webhooks.WebhookTargets;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;

/**
 * The account's webhook endpoints: URLs that receive a signed POST when one of its documents changes.
 * The signing secret is shown once, when the endpoint is created.
 */
@Path("/console/webhook-endpoints")
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
public class WebhookEndpointResource {

    static final int MAX_PAGE_SIZE = 100;

    @Inject
    ConsoleContext context;

    @Inject
    AuditLog auditLog;

    @Inject
    RequestOriginResolver origin;

    @Inject
    SecretCipher cipher;

    @Inject
    JobQueue jobs;

    @Inject
    WebhookRedeliveries redeliveries;

    /** Only true in development and tests, where receivers run on localhost. */
    @ConfigProperty(name = "cetus.webhooks.allow-private-targets")
    boolean allowPrivateTargets;

    /** The event types an endpoint can subscribe to. */
    @GET
    @Path("/event-types")
    @APIResponse(responseCode = "200", description = "OK")
    public List<String> eventTypes() {
        return Arrays.stream(WebhookEventType.values())
                .map(WebhookEventType::wireName)
                .toList();
    }

    @GET
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public List<WebhookEndpointView> list() {
        return WebhookEndpointEntity.listByAccount(context.account().id).stream()
                .map(WebhookEndpointView::from)
                .toList();
    }

    @GET
    @Path("/{id}")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public WebhookEndpointView get(@PathParam("id") UUID id) {
        WebhookEndpointEntity endpoint = find(context.account().id, id);
        return WebhookEndpointView.from(
                endpoint,
                endpoint.status == WebhookEndpointEntity.Status.DISABLED ? redeliveries.count(endpoint) : null);
    }

    /** The signing secret is returned only here, once. */
    @POST
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public CreatedWebhookEndpoint create(@Valid @NotNull CreateWebhookEndpointRequest request) {
        String url = request.url().trim();
        WebhookTargets.problem(url, request.environment(), allowPrivateTargets).ifPresent(problem -> {
            throw new DomainException("invalid_webhook_url", problem);
        });
        List<String> types =
                request.eventTypes() == null ? List.of() : List.copyOf(new LinkedHashSet<>(request.eventTypes()));
        for (String type : types) {
            if (WebhookEventType.fromWireName(type).isEmpty()) {
                throw new DomainException("unknown_event_type", "Unknown event type: " + type);
            }
        }
        String secret = WebhookSignature.newSecret();
        WebhookEndpointEntity endpoint = new WebhookEndpointEntity();
        endpoint.id = Ids.newId();
        endpoint.accountId = context.account().id;
        endpoint.environment = request.environment();
        endpoint.url = url;
        endpoint.description = request.description();
        endpoint.eventTypes = types.toArray(String[]::new);
        endpoint.secretSealed = cipher.sealText(secret);
        endpoint.createdBy = context.userId();
        // Flush so the database-generated createdAt is in the response.
        endpoint.persistAndFlush();
        audit(AuditAction.WEBHOOK_ENDPOINT_CREATED, endpoint, Map.of("eventTypes", types));
        return new CreatedWebhookEndpoint(WebhookEndpointView.from(endpoint), secret);
    }

    /** Stops sending to the endpoint; deliveries still pending are canceled when their turn comes. */
    @DELETE
    @Path("/{id}")
    @Transactional
    @APIResponse(responseCode = "204", description = "No Content")
    public void disable(@PathParam("id") UUID id) {
        WebhookEndpointEntity endpoint = find(context.account().id, id);
        if (endpoint.status == WebhookEndpointEntity.Status.ACTIVE) {
            endpoint.status = WebhookEndpointEntity.Status.DISABLED;
            endpoint.disabledAt = OffsetDateTime.now();
            endpoint.disabledReason = WebhookEndpointEntity.DisabledReason.MANUAL;
            audit(AuditAction.WEBHOOK_ENDPOINT_DISABLED, endpoint, Map.of("reason", "MANUAL"));
        }
    }

    /**
     * Sends to the endpoint again, e.g. once the integrator fixed what made Cetus disable it. The failure
     * count starts over. With {@code redeliver}, the events it missed while failing or disabled are sent
     * again (see WebhookRedeliveries); without it, the failed deliveries can still be sent again one by one.
     */
    @POST
    @Path("/{id}/enable")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public WebhookEndpointView enable(@PathParam("id") UUID id, @Valid EnableWebhookEndpointRequest request) {
        // Locked: a second enabling waits and finds it active, and the events being published are committed
        // before the missed ones are read (see WebhookEndpointEntity.listSubscribed).
        WebhookEndpointEntity endpoint = WebhookEndpointEntity.findForAccountForUpdate(context.account().id, id)
                .orElseThrow(() -> new NotFoundException("Webhook endpoint not found"));
        if (endpoint.status == WebhookEndpointEntity.Status.DISABLED) {
            int redelivered = request != null && request.redeliver() ? redeliveries.redeliver(endpoint) : 0;
            endpoint.status = WebhookEndpointEntity.Status.ACTIVE;
            endpoint.disabledAt = null;
            endpoint.disabledReason = null;
            endpoint.consecutiveFailures = 0;
            endpoint.failingSince = null;
            audit(AuditAction.WEBHOOK_ENDPOINT_ENABLED, endpoint, Map.of("redelivered", redelivered));
        }
        return WebhookEndpointView.from(endpoint);
    }

    /** Newest first: pass the previous page's {@code nextCursor} as {@code before}. */
    @GET
    @Path("/{id}/deliveries")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public WebhookDeliveryPage deliveries(
            @PathParam("id") UUID id,
            @QueryParam("before") UUID before,
            @QueryParam("limit") @DefaultValue("50") int limit) {
        WebhookEndpointEntity endpoint = find(context.account().id, id);
        int size = Math.clamp(limit, 1, MAX_PAGE_SIZE);
        // One more than asked tells whether there is a next page.
        List<WebhookDeliveryEntity> rows = WebhookDeliveryEntity.pageByEndpoint(endpoint.id, before, size + 1);
        List<WebhookDeliveryEntity> page = rows.subList(0, Math.min(size, rows.size()));
        Map<UUID, WebhookEventEntity> events = page.isEmpty()
                ? Map.of()
                : WebhookEventEntity.<WebhookEventEntity>list(
                                "id in ?1", page.stream().map(d -> d.eventId).toList())
                        .stream()
                        .collect(Collectors.toMap(e -> e.id, Function.identity()));
        List<WebhookDeliveryView> items = page.stream()
                .map(d -> WebhookDeliveryView.from(d, events.get(d.eventId)))
                .toList();
        UUID next = rows.size() > size ? page.get(page.size() - 1).id : null;
        return new WebhookDeliveryPage(items, next);
    }

    /** Sends the event again, with the same id and body; a delivery already waiting for its job is left alone. */
    @POST
    @Path("/{id}/deliveries/{deliveryId}/retry")
    @Transactional
    @APIResponse(responseCode = "200", description = "OK")
    public WebhookDeliveryView retry(@PathParam("id") UUID id, @PathParam("deliveryId") UUID deliveryId) {
        WebhookEndpointEntity endpoint = find(context.account().id, id);
        if (endpoint.status != WebhookEndpointEntity.Status.ACTIVE) {
            throw new DomainException("endpoint_disabled", "The endpoint is disabled");
        }
        WebhookDeliveryEntity delivery = WebhookDeliveryEntity.findForEndpoint(endpoint.id, deliveryId)
                .orElseThrow(() -> new NotFoundException("Webhook delivery not found"));
        long queued = JobEntity.count(
                "jobType = ?1 and referenceId = ?2 and status in ('PENDING', 'RUNNING')",
                JobTypes.DELIVER_WEBHOOK,
                delivery.id);
        if (queued > 0) {
            throw new DomainException("delivery_in_progress", "The delivery is already waiting to be sent");
        }
        delivery.status = WebhookDeliveryEntity.Status.PENDING;
        delivery.lastError = null;
        jobs.enqueue(JobTypes.DELIVER_WEBHOOK, delivery.id);
        audit(AuditAction.WEBHOOK_DELIVERY_RETRIED, endpoint, Map.of("deliveryId", delivery.id));
        return WebhookDeliveryView.from(delivery, WebhookEventEntity.findById(delivery.eventId));
    }

    private static WebhookEndpointEntity find(UUID accountId, UUID id) {
        return WebhookEndpointEntity.findForAccount(accountId, id)
                .orElseThrow(() -> new NotFoundException("Webhook endpoint not found"));
    }

    /** Never the secret. */
    private void audit(AuditAction action, WebhookEndpointEntity endpoint, Map<String, Object> extra) {
        Map<String, Object> data = new HashMap<>(extra);
        data.put("url", endpoint.url);
        data.put("environment", endpoint.environment);
        auditLog.record(
                endpoint.accountId, context.actor(), origin.resolve(), action, "webhook_endpoint", endpoint.id, data);
    }

    public record CreateWebhookEndpointRequest(
            @NotBlank @Size(max = 2048) String url,
            @NotNull Environment environment,
            @Size(max = 200) String description,

            @Schema(description = "Event types to receive; empty or missing means all of them") @Size(max = 50)
            List<@NotBlank @Size(max = 100) String> eventTypes) {}

    public record EnableWebhookEndpointRequest(
            @Schema(description = "Send again the events it missed while failing or disabled")
            boolean redeliver) {}

    public record WebhookEndpointView(
            UUID id,
            String url,
            @Schema(nullable = true) String description,
            Environment environment,

            @Schema(description = "Empty means all event types")
            List<String> eventTypes,

            WebhookEndpointEntity.Status status,
            @Schema(nullable = true) OffsetDateTime disabledAt,

            @Schema(nullable = true, description = "AUTOMATIC when Cetus disabled it after failing for days")
            WebhookEndpointEntity.DisabledReason disabledReason,

            @Schema(description = "Failed attempts since the last 2xx")
            int consecutiveFailures,

            @Schema(nullable = true, description = "When the current streak of failures started")
            OffsetDateTime failingSince,

            OffsetDateTime createdAt,

            @Schema(nullable = true, description = "Better Auth user id of the creator")
            String createdBy,

            @Schema(
                    nullable = true,
                    description =
                            "Events it missed while failing or disabled; only in the detail of a disabled endpoint")
            Long missedEvents) {
        static WebhookEndpointView from(WebhookEndpointEntity endpoint) {
            return from(endpoint, null);
        }

        static WebhookEndpointView from(WebhookEndpointEntity endpoint, Long missedEvents) {
            return new WebhookEndpointView(
                    endpoint.id,
                    endpoint.url,
                    endpoint.description,
                    endpoint.environment,
                    List.of(endpoint.eventTypes),
                    endpoint.status,
                    endpoint.disabledAt,
                    endpoint.disabledReason,
                    endpoint.consecutiveFailures,
                    endpoint.failingSince,
                    endpoint.createdAt,
                    endpoint.createdBy,
                    missedEvents);
        }
    }

    public record CreatedWebhookEndpoint(
            WebhookEndpointView endpoint,

            @Schema(description = "whsec_ signing secret; it is not shown again")
            String secret) {}

    public record WebhookDeliveryView(
            UUID id,

            @Schema(description = "Sent as webhook-id") UUID eventId,

            String eventType,
            UUID documentId,
            WebhookDeliveryEntity.Status status,
            int attempts,
            @Schema(nullable = true) Integer lastResponseStatus,

            @Schema(nullable = true, description = "First KB of the endpoint's answer")
            String lastResponseBody,

            @Schema(nullable = true) String lastError,
            @Schema(nullable = true) OffsetDateTime lastAttemptAt,
            @Schema(nullable = true) OffsetDateTime deliveredAt,
            OffsetDateTime createdAt) {
        static WebhookDeliveryView from(WebhookDeliveryEntity delivery, WebhookEventEntity event) {
            return new WebhookDeliveryView(
                    delivery.id,
                    delivery.eventId,
                    event.type,
                    event.documentId,
                    delivery.status,
                    delivery.attempts,
                    delivery.lastResponseStatus,
                    delivery.lastResponseBody,
                    delivery.lastError,
                    delivery.lastAttemptAt,
                    delivery.deliveredAt,
                    delivery.createdAt);
        }
    }

    public record WebhookDeliveryPage(
            @Schema(description = "Newest first") List<WebhookDeliveryView> items,

            @Schema(nullable = true, description = "Pass as before to get the next page")
            UUID nextCursor) {}
}
