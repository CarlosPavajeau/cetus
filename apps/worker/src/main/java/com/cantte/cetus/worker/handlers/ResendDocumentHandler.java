package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.email.EmailSender;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.support.ContextLoader;
import com.cantte.cetus.worker.support.DeliveryContext;
import com.cantte.cetus.worker.support.DeliveryRecorder;
import com.cantte.cetus.worker.support.EmailClients;
import com.cantte.cetus.worker.support.SandboxDeliveries;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.Optional;

/**
 * Emails an accepted document again, from a delivery the console created: to the address it names, or to whom
 * the first delivery would go. SANDBOX documents still only reach the technical contact, within its daily cap.
 */
@ApplicationScoped
public class ResendDocumentHandler implements JobHandler {

    @Inject
    DeliverDocumentHandler delivery;

    @Inject
    ContextLoader loader;

    @Inject
    DeliveryRecorder deliveries;

    @Inject
    EmailClients email;

    @Inject
    SandboxDeliveries sandboxDeliveries;

    @Override
    public String type() {
        return JobTypes.RESEND_DOCUMENT;
    }

    @Override
    public void handle(JobEntity job) {
        DocumentDeliveryEntity pending = QuarkusTransaction.requiringNew()
                .call(() -> DocumentDeliveryEntity.<DocumentDeliveryEntity>findById(job.referenceId));
        if (pending == null || pending.status != DocumentDeliveryEntity.Status.PENDING) {
            return;
        }
        DeliveryContext ctx = loader.loadDelivery(pending.documentId).orElse(null);
        if (ctx == null || ctx.status() != DocumentStatus.ACCEPTED) {
            deliveries.deliveryFailed(pending.id, "The document is not accepted");
            return;
        }
        Optional<EmailSender> sender = email.sender();
        if (sender.isEmpty()) {
            deliveries.deliverySkipped(pending.id, "Email delivery is not configured");
            return;
        }
        String recipient;
        if (ctx.environment() == Environment.SANDBOX) {
            SandboxDeliveries.Recipient sandbox = sandboxDeliveries.recipient(ctx.documentId());
            if (sandbox.skipReason() != null) {
                deliveries.deliverySkipped(pending.id, sandbox.skipReason());
                return;
            }
            recipient = sandbox.email();
        } else if (pending.recipient != null) {
            recipient = pending.recipient;
        } else {
            Optional<String> fallback = email.recipient(ctx.environment(), ctx.customer());
            if (fallback.isEmpty()) {
                deliveries.deliverySkipped(
                        pending.id,
                        ctx.environment() == Environment.LIVE
                                ? "The customer has no email address"
                                : "TEST documents are only emailed to CETUS_EMAIL_TEST_RECIPIENT, which is not set");
                return;
            }
            recipient = fallback.get();
        }

        DeliverDocumentHandler.Files files = delivery.files(ctx);
        deliveries.resendAttempt(pending.id, recipient);
        delivery.send(ctx, files, sender.get(), pending.id, recipient);
    }

    @Override
    public void onDead(JobEntity job, String reason) {
        deliveries.deliveryFailed(job.referenceId, "Gave up after " + job.attempts + " attempts: " + reason);
    }
}
