package com.cantte.cetus.api.billing;

import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.payments.EventCheck;
import com.cantte.cetus.payments.PaymentEvent;
import com.cantte.cetus.payments.PaymentGateway;
import com.cantte.cetus.persistence.entity.InboundWebhookEventEntity;
import io.micrometer.core.instrument.MeterRegistry;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Optional;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.jboss.logging.Logger;

/**
 * Wompi's events. Only stored when signed with the events secret of this environment, once each (a resend is
 * dropped), and acted on by the worker, which asks Wompi for the transaction instead of trusting the event.
 * Anything else that is correctly signed is acknowledged, so Wompi does not retry it.
 */
@Path("/internal/webhooks/wompi")
public class WompiEventResource {

    private static final Logger LOG = Logger.getLogger(WompiEventResource.class);

    @Inject
    PaymentClients payments;

    @Inject
    JobQueue jobs;

    @Inject
    MeterRegistry meters;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(hidden = true)
    public Response receive(String body) {
        Optional<PaymentGateway> gateway = payments.gateway();
        if (gateway.isEmpty()) {
            return ProblemDetail.response(503, "webhook_not_configured", "The Wompi keys are not set");
        }
        String outcome;
        Response response = Response.ok().build();
        switch (gateway.get().verifyEvent(body)) {
            case EventCheck.Verified(PaymentEvent event) -> outcome = record(event, body) ? "received" : "duplicate";
            case EventCheck.OtherEnvironment(String environment) -> {
                LOG.warnf("Wompi event of the %s environment ignored: its event URL points here", environment);
                outcome = "ignored";
            }
            case EventCheck.Invalid(String reason) -> {
                LOG.warnf("Wompi event refused: %s", reason);
                outcome = "invalid";
                response = ProblemDetail.response(401, "invalid_signature", "The event signature is not valid");
            }
        }
        meters.counter("cetus.payments.events", "outcome", outcome).increment();
        return response;
    }

    private boolean record(PaymentEvent event, String body) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Optional<UUID> id = InboundWebhookEventEntity.record(
                    InboundWebhookEventEntity.Provider.WOMPI, event.key(), event.type(), body);
            id.ifPresent(eventId -> jobs.enqueue(JobTypes.PROCESS_WEBHOOK_EVENT, eventId));
            return id.isPresent();
        });
    }
}
