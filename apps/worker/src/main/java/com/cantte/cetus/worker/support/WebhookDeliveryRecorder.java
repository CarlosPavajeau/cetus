package com.cantte.cetus.worker.support;

import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.WebhookDeliveryEntity;
import com.cantte.cetus.persistence.entity.WebhookDeliveryEntity.Status;
import com.cantte.cetus.persistence.entity.WebhookEndpointEntity;
import com.cantte.cetus.persistence.entity.WebhookEventEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

/** Short transactions that track the delivery of a webhook event to one endpoint. */
@ApplicationScoped
public class WebhookDeliveryRecorder {

    /** Longest part of an endpoint's answer that is kept, for the console's delivery history. */
    public static final int MAX_BODY_CHARS = 1024;

    /** What the handler needs to send a delivery, read in one go. */
    public record Target(UUID deliveryId, Status status, UUID eventId, String payload, UUID endpointId,
                         WebhookEndpointEntity.Status endpointStatus, Environment environment, String url,
                         byte[] secretSealed) {
    }

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
    }

    /** Records why an attempt failed; the delivery stays pending for the job's next attempt. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void attemptFailed(UUID deliveryId, Integer responseStatus, String responseBody, String error) {
        WebhookDeliveryEntity delivery = WebhookDeliveryEntity.findById(deliveryId);
        delivery.lastResponseStatus = responseStatus;
        delivery.lastResponseBody = truncate(responseBody);
        delivery.lastError = error;
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

    private static String truncate(String body) {
        return body == null || body.length() <= MAX_BODY_CHARS ? body : body.substring(0, MAX_BODY_CHARS);
    }
}
