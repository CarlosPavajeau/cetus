package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.WebhookDeliveryEntity;
import com.cantte.cetus.persistence.entity.WebhookEndpointEntity;
import com.cantte.cetus.webhooks.WebhookSignature;
import com.cantte.cetus.webhooks.WebhookTargets;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.support.WebhookClients;
import com.cantte.cetus.worker.support.WebhookDeliveryRecorder;
import com.cantte.cetus.worker.support.WebhookDeliveryRecorder.Target;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;

/**
 * POSTs a webhook event to one endpoint, signed with the endpoint's secret (Standard Webhooks). Any answer
 * other than 2xx, a timeout or a network error is retried with the queue's backoff; 410 Gone stops at once.
 * {@code webhook-id} is the event id, the same on every attempt, so the integrator can discard repeats.
 */
@ApplicationScoped
public class DeliverWebhookHandler implements JobHandler {

    static final String USER_AGENT = "Cetus-Webhooks/1";

    @Inject
    WebhookDeliveryRecorder deliveries;
    @Inject
    WebhookClients clients;

    @Override
    public String type() {
        return JobTypes.DELIVER_WEBHOOK;
    }

    @Override
    public void handle(JobEntity job) throws Exception {
        Optional<Target> loaded = deliveries.load(job.referenceId);
        if (loaded.isEmpty() || loaded.get().status() != WebhookDeliveryEntity.Status.PENDING) {
            return;
        }
        Target target = loaded.get();
        if (target.endpointStatus() == WebhookEndpointEntity.Status.DISABLED) {
            deliveries.canceled(target.deliveryId());
            return;
        }
        URI uri = URI.create(target.url());
        Optional<String> blocked = WebhookTargets.problem(target.url(), target.environment(), clients.allowPrivateTargets())
                .or(() -> resolveOrRetry(target, uri));
        if (blocked.isPresent()) {
            deliveries.attemptFailed(target.deliveryId(), null, null, blocked.get());
            throw new GiveUp(blocked.get(), null);
        }

        long timestamp = Instant.now().getEpochSecond();
        String messageId = target.eventId().toString();
        String signature = WebhookSignature.sign(clients.secret(target.endpointId(), target.secretSealed()),
                messageId, timestamp, target.payload());
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(clients.requestTimeout())
                .header("content-type", "application/json")
                .header("user-agent", USER_AGENT)
                .header(WebhookSignature.ID_HEADER, messageId)
                .header(WebhookSignature.TIMESTAMP_HEADER, Long.toString(timestamp))
                .header(WebhookSignature.SIGNATURE_HEADER, signature)
                .POST(HttpRequest.BodyPublishers.ofString(target.payload(), StandardCharsets.UTF_8))
                .build();

        deliveries.attempt(target.deliveryId());
        HttpResponse<InputStream> response;
        String body;
        try {
            response = clients.http().send(request, HttpResponse.BodyHandlers.ofInputStream());
            body = readStart(response.body());
        } catch (IOException e) {
            // Includes timeouts (HttpTimeoutException) and refused connections: retried with backoff.
            deliveries.attemptFailed(target.deliveryId(), null, null, describe(e));
            throw e;
        }
        int status = response.statusCode();
        if (status >= 200 && status < 300) {
            deliveries.succeeded(target.deliveryId(), status, body);
            return;
        }
        String error = "The endpoint answered HTTP " + status;
        deliveries.attemptFailed(target.deliveryId(), status, body, error);
        if (status == 410) {
            throw new GiveUp(error + " (Gone): not retried", null);
        }
        throw new IllegalStateException(error);
    }

    @Override
    public void onDead(JobEntity job, String reason) {
        deliveries.failed(job.referenceId, "Gave up after " + job.attempts + " attempts: " + reason);
    }

    /** A host that does not resolve may be a passing DNS failure: the job is retried. */
    private Optional<String> resolveOrRetry(Target target, URI uri) {
        try {
            return clients.blockedTarget(uri);
        } catch (IOException e) {
            deliveries.attemptFailed(target.deliveryId(), null, null, describe(e));
            throw new IllegalStateException(describe(e), e);
        }
    }

    /** Only the start of the answer is kept; the rest is not even read. */
    private static String readStart(InputStream in) throws IOException {
        try (in) {
            byte[] start = in.readNBytes(WebhookDeliveryRecorder.MAX_BODY_CHARS);
            return new String(start, StandardCharsets.UTF_8);
        }
    }

    private static String describe(IOException e) {
        String message = e.getMessage();
        return e.getClass().getSimpleName() + (message == null ? "" : ": " + message);
    }
}
