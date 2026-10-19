package com.cantte.cetus.worker.support;

import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.entity.WebhookDeliveryEntity;
import com.cantte.cetus.persistence.entity.WebhookDeliveryEntity.Status;
import com.cantte.cetus.persistence.entity.WebhookEndpointEntity;
import com.cantte.cetus.persistence.entity.WebhookEventEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Short transactions that track the delivery of a webhook event to one endpoint, and the health of the
 * endpoint: one that keeps failing for {@code cetus.webhooks.auto-disable.after}, with at least
 * {@code cetus.webhooks.auto-disable.min-failures} failed attempts and no 2xx in between, is disabled so its
 * deliveries stop filling the queue.
 */
@ApplicationScoped
public class WebhookDeliveryRecorder {

    private static final Logger LOG = Logger.getLogger(WebhookDeliveryRecorder.class);

    /** Longest part of an endpoint's answer that is kept, for the console's delivery history. */
    public static final int MAX_BODY_CHARS = 1024;

    /** What the handler needs to send a delivery, read in one go. */
    public record Target(UUID deliveryId, Status status, UUID eventId, String payload, UUID endpointId,
                         WebhookEndpointEntity.Status endpointStatus, Environment environment, String url,
                         byte[] secretSealed) {
    }

    @Inject
    AuditLog auditLog;

    @ConfigProperty(name = "cetus.webhooks.auto-disable.after")
    Duration autoDisableAfter;
    @ConfigProperty(name = "cetus.webhooks.auto-disable.min-failures")
    int autoDisableMinFailures;

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public Optional<Target> load(UUID deliveryId) {
        WebhookDeliveryEntity delivery = WebhookDeliveryEntity.findById(deliveryId);
        if (delivery == null) {
            return Optional.empty();
        }
        WebhookEventEntity event = WebhookEventEntity.findById(delivery.eventId);
        WebhookEndpointEntity endpoint = WebhookEndpointEntity.findById(delivery.endpointId);
        return Optional.of(new Target(delivery.id, delivery.status, event.id, event.payload, endpoint.id,
                endpoint.status, endpoint.environment, endpoint.url, endpoint.secretSealed));
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void attempt(UUID deliveryId) {
        WebhookDeliveryEntity delivery = WebhookDeliveryEntity.findById(deliveryId);
        delivery.attempts++;
        delivery.lastAttemptAt = OffsetDateTime.now();
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void succeeded(UUID deliveryId, int responseStatus, String responseBody) {
        WebhookDeliveryEntity delivery = WebhookDeliveryEntity.findById(deliveryId);
        delivery.status = Status.SUCCEEDED;
        delivery.lastResponseStatus = responseStatus;
        delivery.lastResponseBody = truncate(responseBody);
        delivery.lastError = null;
        delivery.deliveredAt = OffsetDateTime.now();
        // Only written when there is a streak to clear, so busy endpoints do not contend for the row.
        WebhookEndpointEntity.update("consecutiveFailures = 0, failingSince = null where id = ?1 and consecutiveFailures > 0",
                delivery.endpointId);
    }

    /** Records why an attempt failed; the delivery stays pending for the job's next attempt. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void attemptFailed(UUID deliveryId, Integer responseStatus, String responseBody, String error) {
        WebhookDeliveryEntity delivery = WebhookDeliveryEntity.findById(deliveryId);
        delivery.lastResponseStatus = responseStatus;
        delivery.lastResponseBody = truncate(responseBody);
        delivery.lastError = error;
        endpointFailed(delivery.endpointId);
    }

    /** No more attempts. A delivery that already succeeded or was canceled keeps its status. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void failed(UUID deliveryId, String error) {
        WebhookDeliveryEntity delivery = WebhookDeliveryEntity.findById(deliveryId);
        if (delivery != null && delivery.status == Status.PENDING) {
            delivery.status = Status.FAILED;
            delivery.lastError = error;
        }
    }

    /** The endpoint was disabled before the delivery went out. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void canceled(UUID deliveryId) {
        WebhookDeliveryEntity delivery = WebhookDeliveryEntity.findById(deliveryId);
        delivery.status = Status.CANCELED;
        delivery.lastError = "The endpoint was disabled";
    }

    /** Counts the failure; locked, since several deliveries to the endpoint can fail at once. */
    private void endpointFailed(UUID endpointId) {
        WebhookEndpointEntity endpoint = WebhookEndpointEntity.findById(endpointId, LockModeType.PESSIMISTIC_WRITE);
        OffsetDateTime now = OffsetDateTime.now();
        endpoint.consecutiveFailures++;
        if (endpoint.failingSince == null) {
            endpoint.failingSince = now;
        }
        boolean longEnough = !endpoint.failingSince.plus(autoDisableAfter).isAfter(now);
        if (endpoint.status == WebhookEndpointEntity.Status.ACTIVE && longEnough
                && endpoint.consecutiveFailures >= autoDisableMinFailures) {
            endpoint.status = WebhookEndpointEntity.Status.DISABLED;
            endpoint.disabledAt = now;
            endpoint.disabledReason = WebhookEndpointEntity.DisabledReason.AUTOMATIC;
            auditLog.record(endpoint.accountId, Actor.system(), null, AuditAction.WEBHOOK_ENDPOINT_DISABLED,
                    "webhook_endpoint", endpoint.id, Map.of("url", endpoint.url, "environment", endpoint.environment,
                            "reason", "AUTOMATIC", "consecutiveFailures", endpoint.consecutiveFailures,
                            "failingSince", endpoint.failingSince.toString()));
            LOG.warnf("Disabled webhook endpoint %s: %d failed attempts since %s", endpoint.id,
                    endpoint.consecutiveFailures, endpoint.failingSince);
        }
    }

    private static String truncate(String body) {
        return body == null || body.length() <= MAX_BODY_CHARS ? body : body.substring(0, MAX_BODY_CHARS);
    }
}
