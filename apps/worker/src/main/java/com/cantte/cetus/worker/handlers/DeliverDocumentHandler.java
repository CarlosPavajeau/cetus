package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.domain.dian.DianFileNames;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.email.EmailMessage;
import com.cantte.cetus.email.EmailRateLimited;
import com.cantte.cetus.email.EmailRejectedException;
import com.cantte.cetus.email.EmailSender;
import com.cantte.cetus.email.EmailTransientException;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity.Kind;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.signing.XadesSigner;
import com.cantte.cetus.signing.XmlSupport;
import com.cantte.cetus.ubl.AttachedDocumentMapper;
import com.cantte.cetus.ubl.UblMarshaller;
import com.cantte.cetus.worker.delivery.DeliveryEmail;
import com.cantte.cetus.worker.delivery.PdfRenderer;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.runner.RetryLater;
import com.cantte.cetus.worker.support.ArtifactStore;
import com.cantte.cetus.worker.support.ArtifactStore.Stored;
import com.cantte.cetus.worker.support.ContextLoader;
import com.cantte.cetus.worker.support.DeliveryRecorder;
import com.cantte.cetus.worker.support.EmailClients;
import com.cantte.cetus.worker.support.KeyMaterialCache;
import com.cantte.cetus.worker.support.ProcessingContext;
import com.cantte.cetus.worker.support.ProviderSettings;
import com.cantte.cetus.worker.support.SandboxDeliveries;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.jboss.logging.Logger;
import org.w3c.dom.Document;

/**
 * Delivers an accepted document to its customer (annex section 9.1): builds and signs the AttachedDocument,
 * renders the PDF, stores both as artifacts and emails them in a single zip.
 *
 * <p>Every step can be retried: artifacts already stored are reused, and the email goes out with an
 * idempotency key derived from the delivery id, so a retry after a lost answer never sends it twice.
 */
@ApplicationScoped
public class DeliverDocumentHandler implements JobHandler {

    private static final Logger LOG = Logger.getLogger(DeliverDocumentHandler.class);
    /** Annex section 9.1: "Peso máximo por envío: 2 Megas". */
    static final int MAX_ZIP_BYTES = 2 * 1024 * 1024;

    private final XadesSigner signer = new XadesSigner();
    private final AttachedDocumentMapper mapper = new AttachedDocumentMapper();
    private final UblMarshaller marshaller = new UblMarshaller();
    private final PdfRenderer pdfRenderer = new PdfRenderer();

    @Inject
    ContextLoader loader;

    @Inject
    ArtifactStore artifacts;

    @Inject
    KeyMaterialCache keyCache;

    @Inject
    DeliveryRecorder deliveries;

    @Inject
    EmailClients email;

    @Inject
    ProviderSettings provider;

    @Inject
    SandboxDeliveries sandboxDeliveries;

    @Override
    public String type() {
        return JobTypes.DELIVER_DOCUMENT;
    }

    @Override
    public void handle(JobEntity job) {
        ProcessingContext ctx = loader.load(job.referenceId).orElse(null);
        if (ctx == null || ctx.status() != DocumentStatus.ACCEPTED || deliveries.resolved(ctx.documentId())) {
            return;
        }

        Stored attached =
                artifacts.latest(ctx.documentId(), Kind.ATTACHED_DOCUMENT).orElseGet(() -> attachedDocument(ctx));
        Stored pdf = artifacts.latest(ctx.documentId(), Kind.PDF).orElseGet(() -> pdf(ctx));

        Optional<EmailSender> sender = email.sender();
        if (sender.isEmpty()) {
            deliveries.skipped(ctx.documentId(), "Email delivery is not configured");
            return;
        }
        Optional<String> recipient;
        if (ctx.environment() == Environment.SANDBOX) {
            SandboxDeliveries.Recipient sandbox = sandboxDeliveries.recipient(ctx.documentId());
            if (sandbox.skipReason() != null) {
                deliveries.skipped(ctx.documentId(), sandbox.skipReason());
                return;
            }
            recipient = Optional.of(sandbox.email());
        } else {
            recipient = email.recipient(ctx.environment(), ctx.customer());
        }
        if (recipient.isEmpty()) {
            deliveries.skipped(
                    ctx.documentId(),
                    switch (ctx.environment()) {
                        case TEST -> "TEST documents are only emailed to CETUS_EMAIL_TEST_RECIPIENT, which is not set";
                        case LIVE -> "The customer has no email address";
                        case SANDBOX -> "SANDBOX documents are never emailed to their customer";
                    });
            return;
        }

        String zipName = attached.fileName().replaceFirst("\\.xml$", ".zip");
        byte[] zip = zip(attached, pdf);
        UUID deliveryId = deliveries.attempt(ctx.documentId(), recipient.get());
        if (zip.length > MAX_ZIP_BYTES) {
            deliveries.failed(
                    ctx.documentId(), "The zip weighs " + zip.length + " bytes; the annex allows 2 MB per email");
            return;
        }

        DeliveryEmail content = DeliveryEmail.of(ctx);
        EmailMessage message = new EmailMessage(
                email.from(),
                recipient.get(),
                ctx.supplier().email(),
                content.subject(),
                content.html(),
                content.text(),
                List.of(new EmailMessage.Attachment(zipName, zip)));
        String messageId;
        try {
            messageId = sender.get().send(message, "delivery-" + deliveryId);
        } catch (EmailRateLimited e) {
            deliveries.attemptFailed(deliveryId, e.getMessage());
            throw new RetryLater(email.rateLimitDelay(), e.getMessage());
        } catch (EmailTransientException e) {
            deliveries.attemptFailed(deliveryId, e.getMessage());
            throw e;
        } catch (EmailRejectedException e) {
            deliveries.failed(ctx.documentId(), e.getMessage());
            throw new GiveUp(e.getMessage(), e);
        }
        deliveries.sent(deliveryId, messageId);
        LOG.infof("Document %s emailed (delivery %s, message %s)", ctx.fullNumber(), deliveryId, messageId);
    }

    @Override
    public void onDead(JobEntity job, String reason) {
        deliveries.failed(job.referenceId, "Gave up after " + job.attempts + " attempts: " + reason);
    }

    /** The signed document and the DIAN's ApplicationResponse in the container, signed by the issuer. */
    private Stored attachedDocument(ProcessingContext ctx) {
        Stored signedXml = artifacts
                .latest(ctx.documentId(), Kind.SIGNED_XML)
                .orElseThrow(() -> new GiveUp("Accepted document " + ctx.documentId() + " has no signed XML", null));
        Stored applicationResponse = artifacts
                .latest(ctx.documentId(), Kind.APPLICATION_RESPONSE)
                .orElseThrow(
                        () -> new GiveUp("The DIAN returned no ApplicationResponse for " + ctx.fullNumber(), null));

        Document container = marshaller.toDocument(mapper.map(new AttachedDocumentMapper.Contents(
                ctx.environment(),
                ctx.documentType(),
                ctx.fullNumber(),
                ctx.existingCufe(),
                ctx.supplier(),
                ctx.customer(),
                signedXml.content(),
                applicationResponse.content(),
                ctx.validatedAt() == null ? OffsetDateTime.now() : ctx.validatedAt(),
                OffsetDateTime.now())));
        signer.sign(
                container,
                UblMarshaller.signatureSlot(container),
                keyCache.get(ctx.certificate()),
                XadesSigner.SignerRole.SUPPLIER);
        byte[] xml = XmlSupport.serialize(container);
        String name = DianFileNames.attachedDocument(signedXml.fileName());
        artifacts.save(ctx, Kind.ATTACHED_DOCUMENT, name, xml, "application/xml");
        return new Stored(name, xml);
    }

    private Stored pdf(ProcessingContext ctx) {
        byte[] pdf = pdfRenderer.render(
                ctx,
                ctx.existingCufe(),
                new PdfRenderer.Legend(
                        provider.softwareName(),
                        provider.providerName(ctx.supplier()),
                        provider.providerNit(ctx.supplier())));
        String name = ctx.fullNumber() + ".pdf";
        artifacts.save(ctx, Kind.PDF, name, pdf, "application/pdf");
        return new Stored(name, pdf);
    }

    /** The single zip the annex asks for: the AttachedDocument and, optionally, the PDF. */
    private static byte[] zip(Stored attached, Stored pdf) {
        try (ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                ZipOutputStream zip = new ZipOutputStream(bytes)) {
            for (Stored file : List.of(attached, pdf)) {
                zip.putNextEntry(new ZipEntry(file.fileName()));
                zip.write(file.content());
                zip.closeEntry();
            }
            zip.finish();
            return bytes.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
