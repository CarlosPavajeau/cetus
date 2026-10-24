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
import com.cantte.cetus.worker.support.WebhookClients.BlockedTargetException;
import com.cantte.cetus.worker.support.WebhookDeliveryRecorder;
import com.cantte.cetus.worker.support.WebhookDeliveryRecorder.Target;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;
import okhttp3.MediaType;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * POSTs a webhook event to one endpoint, signed with the endpoint's secret (Standard Webhooks). Any answer
 * other than 2xx, a timeout or a network error is retried with the queue's backoff; 410 Gone and an
 * endpoint on an internal address stop at once. {@code webhook-id} is the event id, the same on every
 * attempt, so the integrator can discard repeats.
 */
@ApplicationScoped
public class DeliverWebhookHandler implements JobHandler {

    static final String USER_AGENT = "Cetus-Webhooks/1";
    private static final MediaType JSON = MediaType.get("application/json");

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
        if (target.endpointStatus() == WebhookEndpointEntity.Status.DISABLED
                && deliveries.canceled(target.deliveryId())) {
            return;
        }
        // Literal addresses never reach the client's DNS lookup, so they are checked here.
        Optional<String> problem =
                WebhookTargets.problem(target.url(), target.environment(), clients.allowPrivateTargets());
        if (problem.isPresent()) {
            deliveries.attemptFailed(target.deliveryId(), null, null, problem.get());
            throw new GiveUp(problem.get(), null);
        }

        long timestamp = Instant.now().getEpochSecond();
        String messageId = target.eventId().toString();
        String signature = WebhookSignature.sign(
                clients.secret(target.endpointId(), target.secretSealed()), messageId, timestamp, target.payload());
        Request request = new Request.Builder()
                .url(target.url())
                .header("user-agent", USER_AGENT)
                .header(WebhookSignature.ID_HEADER, messageId)
                .header(WebhookSignature.TIMESTAMP_HEADER, Long.toString(timestamp))
                .header(WebhookSignature.SIGNATURE_HEADER, signature)
                .post(RequestBody.create(target.payload().getBytes(StandardCharsets.UTF_8), JSON))
                .build();

        deliveries.attempt(target.deliveryId());
        int status;
        String body;
        try (Response response = clients.http().newCall(request).execute()) {
            status = response.code();
            body = readStart(response.body());
        } catch (BlockedTargetException e) {
            deliveries.attemptFailed(target.deliveryId(), null, null, e.getMessage());
            throw new GiveUp(e.getMessage(), e);
        } catch (IOException e) {
            // Timeouts, refused connections and hosts that do not resolve (maybe a passing DNS failure).
            deliveries.attemptFailed(target.deliveryId(), null, null, describe(e));
            throw e;
        }
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

    /** Only the start of the answer is kept; the rest is not even read. */
    private static String readStart(ResponseBody body) throws IOException {
        try (InputStream in = body.byteStream()) {
            return new String(in.readNBytes(WebhookDeliveryRecorder.MAX_BODY_CHARS), StandardCharsets.UTF_8);
        }
    }

    private static String describe(IOException e) {
        String message = e.getMessage();
        return e.getClass().getSimpleName() + (message == null ? "" : ": " + message);
    }
}
