package com.cantte.cetus.api.documents;

import com.cantte.cetus.api.error.ProblemDetail;
import com.cantte.cetus.cache.Cache;
import com.cantte.cetus.cache.Caches;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.calc.CalculatedLine;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.calc.TaxAmount;
import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.AfterCommit;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.DocumentLineEntity;
import com.cantte.cetus.persistence.entity.DocumentTaxEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import com.cantte.cetus.persistence.entity.SigningCertificateEntity;
import com.cantte.cetus.persistence.entity.SoftwareCredentialEntity;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * The steps every document type shares at creation: the issuer can issue, the document takes the
 * next number of its own range, the calculation is stored as lines and taxes, and the job is enqueued.
 */
@ApplicationScoped
public class DocumentDrafts {

    private static final Logger LOG = Logger.getLogger(DocumentDrafts.class);

    @Inject
    JobQueue jobs;

    @Inject
    AfterCommit afterCommit;

    @Inject
    MeterRegistry meters;

    @ConfigProperty(name = "cetus.sandbox.daily-documents")
    int sandboxDailyDocuments;

    private final Cache<String, Boolean> credentialed;

    @Inject
    public DocumentDrafts(
            Caches caches,
            @ConfigProperty(name = "cetus.cache.issuers.max-entries", defaultValue = "1024") int capacity) {
        credentialed = caches.shared("issuer-credentials", capacity, Duration.ofSeconds(30), Boolean.class);
    }

    /** Whether the issuer's status lets it issue in the environment: ENABLED, or TESTING with a test key. */
    public static boolean canIssue(IssuerEntity issuer, Environment environment) {
        return issuer.status == IssuerEntity.Status.ENABLED
                || (environment == Environment.TEST && issuer.status == IssuerEntity.Status.TESTING);
    }

    public void ensureReady(IssuerEntity issuer, Environment environment) {
        if (!canIssue(issuer, environment)) {
            throw new DomainException("issuer_not_ready", "The issuer is not enabled to issue documents yet");
        }
        if (environment == Environment.SANDBOX) {
            // Signed with Cetus' sandbox credentials, never with the issuer's.
            return;
        }
        // Credentials are only ever replaced, never removed, so an issuer that had them keeps having them.
        Optional<Boolean> ready = credentialed.find(
                issuer.id.toString(),
                () -> missingCredential(issuer.id)
                        .map(missing -> Optional.<Boolean>empty())
                        .orElse(Optional.of(Boolean.TRUE)));
        if (ready.isEmpty()) {
            Optional<DomainException> missing = missingCredential(issuer.id);
            if (missing.isPresent()) {
                throw missing.get();
            }
        }
    }

    private static Optional<DomainException> missingCredential(UUID issuerId) {
        if (SoftwareCredentialEntity.findActive(issuerId).isEmpty()) {
            return Optional.of(
                    new DomainException("issuer_missing_software", "The issuer has no DIAN software credentials"));
        }
        // An accepted test set takes no more documents, but habilitación still validates them with
        // SendBillSync: the worker switches to it on its own once the set is accepted.
        if (SigningCertificateEntity.findActive(issuerId).isEmpty()) {
            return Optional.of(
                    new DomainException("issuer_missing_certificate", "The issuer has no signing certificate"));
        }
        return Optional.empty();
    }

    /**
     * The invoice the correction points at, locked until the transaction ends; it must belong to the
     * account and environment and be accepted by the DIAN.
     */
    public DocumentEntity lockCorrectedInvoice(
            UUID accountId, Environment environment, CorrectionRequest request, String verb) {
        DocumentEntity invoice = DocumentEntity.lockForAccount(accountId, request.invoiceId(), environment)
                .filter(doc -> doc.documentType == DocumentType.INVOICE)
                .orElseThrow(() -> new NotFoundException("Invoice not found"));
        if (invoice.status != DocumentStatus.ACCEPTED) {
            throw new DomainException(
                    "invoice_not_accepted",
                    "Only invoices accepted by the DIAN can be " + verb + "; this one is " + invoice.status);
        }
        return invoice;
    }

    /**
     * A new document of the type, dated now in Colombia time and numbered from the issuer's active range
     * for that type, with the calculated totals, lines and taxes. The caller fills in the rest and
     * calls {@link #submit}.
     */
    public DocumentEntity draft(
            UUID accountId,
            IssuerEntity issuer,
            Environment environment,
            DocumentType type,
            CalculationResult calculation) {
        ZonedDateTime now = ZonedDateTime.now(DianTime.ZONE).truncatedTo(ChronoUnit.SECONDS);
        if (environment == Environment.SANDBOX) {
            requireSandboxQuota(accountId, now);
        }
        NumberingRangeEntity range = NumberingRangeEntity.lockActive(issuer.id, type, now.toLocalDate())
                .orElseThrow(() -> new DomainException(
                        "no_active_numbering_range", "The issuer has no active numbering range for " + label(type)));
        if (type == DocumentType.INVOICE && environment == Environment.LIVE && range.technicalKeySealed == null) {
            throw new DomainException(
                    "technical_key_pending",
                    "The numbering range is waiting for its technical key from the DIAN; try again in a few minutes");
        }

        DocumentEntity doc = new DocumentEntity();
        doc.id = Ids.newId();
        doc.accountId = accountId;
        doc.issuerId = issuer.id;
        doc.environment = environment;
        doc.documentType = type;
        doc.numberingRangeId = range.id;
        doc.prefix = range.prefix;
        doc.number = range.take();
        doc.issueDate = now.toLocalDate();
        doc.issueTime = now.toLocalTime();
        doc.lineExtensionAmount = calculation.totals().lineExtensionAmount();
        doc.taxExclusiveAmount = calculation.totals().taxExclusiveAmount();
        doc.taxInclusiveAmount = calculation.totals().taxInclusiveAmount();
        doc.payableAmount = calculation.totals().payableAmount();

        for (CalculatedLine line : calculation.lines()) {
            DocumentLineEntity lineEntity = new DocumentLineEntity();
            lineEntity.id = Ids.newId();
            lineEntity.document = doc;
            lineEntity.lineNumber = line.number();
            lineEntity.itemCode = line.itemCode();
            lineEntity.description = line.description();
            lineEntity.quantity = line.quantity();
            lineEntity.unitCode = line.unitCode();
            lineEntity.unitPrice = line.unitPrice();
            lineEntity.lineExtensionAmount = line.lineExtensionAmount();
            doc.lines.add(lineEntity);
            for (TaxAmount tax : line.taxes()) {
                doc.taxes.add(tax(doc, lineEntity, tax));
            }
        }
        calculation.taxTotals().forEach(total -> total.subtotals().forEach(sub -> doc.taxes.add(tax(doc, null, sub))));
        return doc;
    }

    /**
     * Persists the document and enqueues its processing, in the caller's transaction. A SANDBOX document
     * waits one to three seconds first, about what the DIAN takes, so an integration does not count on an
     * answer faster than production will give.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public void submit(DocumentEntity doc) {
        // Flush so the database-generated createdAt is in the response.
        doc.persistAndFlush();
        Duration delay = doc.environment == Environment.SANDBOX
                ? Duration.ofMillis(ThreadLocalRandom.current().nextLong(1000, 3001))
                : Duration.ZERO;
        jobs.enqueue(JobTypes.PROCESS_DOCUMENT, doc.id, delay);
        LOG.infof("Document %s received (%s, %s)", doc.id, doc.documentType, doc.environment);
        afterCommit.run(() -> meters.counter(
                        "cetus.documents.created",
                        "document.type",
                        doc.documentType.name(),
                        "environment",
                        doc.environment.name())
                .increment());
    }

    /** Links the note to the invoice it corrects, taking its currency, customer and payment, and submits it. */
    @Transactional(Transactional.TxType.MANDATORY)
    public void submitCorrection(
            DocumentEntity note, DocumentEntity invoice, CorrectionRequest request, String rawJson) {
        note.referencedDocumentId = invoice.id;
        note.correctionConcept = request.concept().name();
        note.correctionDescription = request.description();
        note.currency = invoice.currency;
        note.customer = invoice.customer;
        note.payment = invoice.payment;
        note.notes = request.notes() == null ? List.of() : List.copyOf(request.notes());
        note.requestPayload = rawJson;
        note.externalReference = request.externalReference();
        submit(note);
    }

    /**
     * The sandbox is free, so an account issues at most {@code cetus.sandbox.daily-documents} a day there.
     * A lock per account until the transaction ends keeps two requests from both counting one slot left.
     */
    private void requireSandboxQuota(UUID accountId, ZonedDateTime now) {
        DocumentEntity.getEntityManager()
                .createNativeQuery("SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(:key, 0))")
                .setParameter("key", "sandbox-quota:" + accountId)
                .getSingleResult();
        ZonedDateTime midnight = now.toLocalDate().atStartOfDay(DianTime.ZONE);
        long issuedToday = DocumentEntity.count(
                "accountId = ?1 and environment = ?2 and createdAt >= ?3",
                accountId,
                Environment.SANDBOX,
                midnight.toOffsetDateTime());
        if (issuedToday >= sandboxDailyDocuments) {
            throw new SandboxDailyLimit(sandboxDailyDocuments, Duration.between(now, midnight.plusDays(1)));
        }
    }

    /** 429 until midnight in Colombia, when the account's sandbox quota starts again. */
    public static class SandboxDailyLimit extends WebApplicationException {

        SandboxDailyLimit(int limit, Duration untilMidnight) {
            super(ProblemDetail.builder(
                            429,
                            "sandbox_daily_limit",
                            "This account already issued its " + limit + " sandbox documents of the day")
                    .header("Retry-After", Math.max(1, untilMidnight.toSeconds()))
                    .build());
        }
    }

    private static String label(DocumentType type) {
        return switch (type) {
            case INVOICE -> "invoices";
            case CREDIT_NOTE -> "credit notes";
            case DEBIT_NOTE -> "debit notes";
        };
    }

    private static DocumentTaxEntity tax(DocumentEntity doc, DocumentLineEntity line, TaxAmount amount) {
        DocumentTaxEntity tax = new DocumentTaxEntity();
        tax.id = Ids.newId();
        tax.document = doc;
        tax.line = line;
        tax.taxType = amount.type();
        tax.taxableAmount = amount.taxableAmount();
        tax.percent = amount.percent();
        tax.taxAmount = amount.amount();
        return tax;
    }
}
