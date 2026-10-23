package com.cantte.cetus.worker.support;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.aws.SecretCipher;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.calc.CalculatedLine;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.calc.TaxAmount;
import com.cantte.cetus.domain.dian.Hashing;
import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.DebitNoteConcept;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PaymentInfo;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.domain.model.TaxType;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.AccountContactEntity;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.DocumentLineEntity;
import com.cantte.cetus.persistence.entity.DocumentTaxEntity;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import com.cantte.cetus.persistence.entity.SigningCertificateEntity;
import com.cantte.cetus.persistence.entity.SoftwareCredentialEntity;
import com.cantte.cetus.persistence.entity.WebhookEndpointEntity;
import com.cantte.cetus.webhooks.WebhookSignature;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Seeds, straight into the database, a TEST issuer ready to send with SendBillSync (software
 * without a test set id) and one invoice, or a credit note on it, waiting to be processed.
 */
@ApplicationScoped
public class WorkerFixtures {

    private static final Address ADDRESS = new Address("11001", "Bogotá, D.C.", "11", "Bogotá", "110111",
            "Calle 100 # 10-20", "CO", "Colombia");

    @Inject
    DocumentStorage storage;
    @Inject
    SecretCipher cipher;

    /** Creates the issuer and an invoice in RECEIVED; returns the invoice id. */
    public UUID invoice() {
        return QuarkusTransaction.requiringNew().call(() -> {
            AccountEntity account = new AccountEntity();
            account.id = Ids.newId();
            account.organizationId = "org_" + account.id;
            account.name = "Worker SAS";
            account.persist();

            IssuerEntity issuer = new IssuerEntity();
            issuer.id = Ids.newId();
            issuer.accountId = account.id;
            issuer.environment = Environment.TEST;
            issuer.nit = "900123456";
            issuer.checkDigit = "8";
            issuer.legalName = "Cetus Pruebas SAS";
            issuer.personType = PersonType.LEGAL_ENTITY;
            issuer.taxLevelCodes = "O-13";
            issuer.taxSchemeId = "01";
            issuer.taxSchemeName = "IVA";
            issuer.address = ADDRESS;
            issuer.email = "facturas@cetus.test";
            issuer.operationMode = IssuerEntity.OperationMode.OWN_SOFTWARE;
            issuer.status = IssuerEntity.Status.TESTING;
            issuer.persist();

            SoftwareCredentialEntity software = new SoftwareCredentialEntity();
            software.id = Ids.newId();
            software.issuerId = issuer.id;
            software.softwareId = UUID.randomUUID().toString();
            software.pinSealed = cipher.sealText("12345");
            software.persist();

            SigningCertificateEntity certificate = new SigningCertificateEntity();
            certificate.id = Ids.newId();
            certificate.issuerId = issuer.id;
            certificate.s3Key = "certificates/" + certificate.id + ".p12";
            storage.put(certificate.s3Key, cipher.seal(testSigner()), "application/x-pkcs12");
            certificate.passwordSealed = cipher.sealText("cetus-test");
            certificate.subjectDn = "CN=Cetus Test Signer";
            certificate.issuerDn = "CN=Cetus Test Signer";
            certificate.serialNumber = "1";
            certificate.fingerprintSha256 = "test";
            certificate.validFrom = OffsetDateTime.now().minusDays(1);
            certificate.validTo = OffsetDateTime.now().plusYears(1);
            certificate.persist();

            NumberingRangeEntity range = new NumberingRangeEntity();
            range.id = Ids.newId();
            range.issuerId = issuer.id;
            range.documentType = DocumentType.INVOICE;
            range.resolutionNumber = "18760000001";
            range.resolutionDate = LocalDate.of(2019, 1, 19);
            range.prefix = "SETP";
            range.rangeFrom = 990000000;
            range.rangeTo = 995000000;
            // CUFEs are unique: a different number per seeded invoice keeps them apart.
            range.nextNumber = ThreadLocalRandom.current().nextLong(990000001, 995000000);
            range.validFrom = LocalDate.of(2019, 1, 19);
            range.validTo = LocalDate.of(2030, 1, 19);
            range.technicalKeySealed = cipher.sealText("fc8eac422eba16e22ffd8c6f94b3f40a6e38162c");
            range.persist();

            return document(account.id, issuer.id, range, DocumentType.INVOICE).id;
        });
    }

    /**
     * Marks the invoice as accepted by the DIAN and creates, in RECEIVED, a credit note that cancels it,
     * numbered in its own NC range without resolution or technical key. Returns the note id.
     */
    public UUID creditNote(UUID invoiceId) {
        return note(invoiceId, DocumentType.CREDIT_NOTE, "NC", CreditNoteConcept.CANCELLATION.name(),
                "Anulación por error en el valor");
    }

    /** Like {@link #creditNote}, but a debit note charging interest, numbered in its own ND range. */
    public UUID debitNote(UUID invoiceId) {
        return note(invoiceId, DocumentType.DEBIT_NOTE, "ND", DebitNoteConcept.INTEREST.name(),
                "Intereses de mora");
    }

    private UUID note(UUID invoiceId, DocumentType type, String prefix, String concept, String description) {
        return QuarkusTransaction.requiringNew().call(() -> {
            DocumentEntity invoice = DocumentEntity.findById(invoiceId);
            invoice.status = DocumentStatus.ACCEPTED;
            invoice.cufe = Hashing.sha384Hex("cufe-" + invoice.id);

            NumberingRangeEntity range = new NumberingRangeEntity();
            range.id = Ids.newId();
            range.issuerId = invoice.issuerId;
            range.documentType = type;
            range.prefix = prefix;
            range.rangeFrom = 1;
            range.rangeTo = 99999999;
            // CUDEs are unique too, and every seeded issuer shares the NIT.
            range.nextNumber = ThreadLocalRandom.current().nextLong(1, 99999999);
            range.persist();

            DocumentEntity note = document(invoice.accountId, invoice.issuerId, range, type);
            note.referencedDocumentId = invoice.id;
            note.correctionConcept = concept;
            note.correctionDescription = description;
            return note.id;
        });
    }

    /** A webhook endpoint registered as the console does it, with its secret in clear for the test. */
    public record Endpoint(UUID id, String secret) {
    }

    /** Registers an active endpoint for the document's account; no event types means all of them. */
    public Endpoint webhookEndpoint(UUID documentId, Environment environment, String url, String... eventTypes) {
        return QuarkusTransaction.requiringNew().call(() -> {
            DocumentEntity doc = DocumentEntity.findById(documentId);
            String secret = WebhookSignature.newSecret();
            WebhookEndpointEntity endpoint = new WebhookEndpointEntity();
            endpoint.id = Ids.newId();
            endpoint.accountId = doc.accountId;
            endpoint.environment = environment;
            endpoint.url = url;
            endpoint.eventTypes = eventTypes;
            endpoint.secretSealed = cipher.sealText(secret);
            endpoint.persist();
            return new Endpoint(endpoint.id, secret);
        });
    }

    /** The calculation of every seeded document. */
    public static CalculationResult calculation() {
        return new InvoiceCalculator().calculate(List.of(
                new LineInput("SKU-1", "Servicio de consultoría", new BigDecimal("1"), "94", new BigDecimal("100000"),
                        List.of(new LineInput.LineTax(TaxType.IVA, new BigDecimal("19")))),
                new LineInput("SKU-2", "Libro", new BigDecimal("2"), "94", new BigDecimal("50"),
                        List.of(new LineInput.LineTax(TaxType.IVA, new BigDecimal("5"))))));
    }

    /** Points the account's categories to these addresses, verified (null leaves a category without contact). */
    public void contacts(UUID accountId, String technical, String fiscal, String billing) {
        QuarkusTransaction.requiringNew().run(() -> {
            for (var entry : Map.of(AccountContactEntity.Category.TECHNICAL, Optional.ofNullable(technical),
                    AccountContactEntity.Category.FISCAL, Optional.ofNullable(fiscal),
                    AccountContactEntity.Category.BILLING, Optional.ofNullable(billing)).entrySet()) {
                entry.getValue().ifPresent(email -> {
                    AccountContactEntity contact = new AccountContactEntity();
                    contact.id = Ids.newId();
                    contact.accountId = accountId;
                    contact.category = entry.getKey();
                    contact.email = email;
                    contact.verifiedAt = OffsetDateTime.now();
                    contact.persist();
                });
            }
        });
    }

    /** The SEND_NOTIFICATION job of a notice, as the claimer hands it over. */
    public JobEntity notificationJob(UUID notificationId) {
        return QuarkusTransaction.requiringNew().call(() -> JobEntity.<JobEntity>find("jobType = ?1 and referenceId = ?2",
                JobTypes.SEND_NOTIFICATION, notificationId).singleResult());
    }

    /** A job for the document as the claimer hands it over: RUNNING, on the given attempt. */
    public JobEntity job(UUID documentId, int attempts) {
        return QuarkusTransaction.requiringNew().call(() -> {
            JobEntity job = new JobEntity();
            job.id = Ids.newId();
            job.jobType = JobTypes.PROCESS_DOCUMENT;
            job.referenceId = documentId;
            job.status = "RUNNING";
            job.attempts = attempts;
            job.runAt = OffsetDateTime.now();
            job.updatedAt = job.runAt;
            job.persist();
            return job;
        });
    }

    /** A PROCESS_DOCUMENT job ready to be claimed, as the API leaves it. */
    public JobEntity pendingJob(UUID documentId) {
        return pendingJob(JobTypes.PROCESS_DOCUMENT, documentId);
    }

    public JobEntity pendingJob(String type, UUID documentId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            JobEntity job = new JobEntity();
            job.id = Ids.newId();
            job.jobType = type;
            job.referenceId = documentId;
            job.runAt = OffsetDateTime.now().minusSeconds(1);
            job.updatedAt = OffsetDateTime.now();
            job.persist();
            return job;
        });
    }

    private static DocumentEntity document(UUID accountId, UUID issuerId, NumberingRangeEntity range, DocumentType type) {
        CalculationResult calculation = calculation();

        DocumentEntity doc = new DocumentEntity();
        doc.id = Ids.newId();
        doc.accountId = accountId;
        doc.issuerId = issuerId;
        doc.environment = Environment.TEST;
        doc.documentType = type;
        doc.numberingRangeId = range.id;
        doc.prefix = range.prefix;
        doc.number = range.take();
        doc.issueDate = LocalDate.now();
        doc.issueTime = LocalTime.of(10, 30);
        doc.customer = new Party(PersonType.LEGAL_ENTITY, IdentificationType.NIT, "900108281", "3",
                "OPTICAS GMO COLOMBIA S A S", null, List.of("R-99-PN"), "01", "IVA", ADDRESS,
                "compras@example.com", null);
        doc.payment = new PaymentInfo("1", "10", null);
        doc.lineExtensionAmount = calculation.totals().lineExtensionAmount();
        doc.taxExclusiveAmount = calculation.totals().taxExclusiveAmount();
        doc.taxInclusiveAmount = calculation.totals().taxInclusiveAmount();
        doc.payableAmount = calculation.totals().payableAmount();
        doc.requestPayload = "{}";

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
        doc.persist();
        return doc;
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

    private static byte[] testSigner() {
        try (InputStream in = WorkerFixtures.class.getResourceAsStream("/test-signer.p12")) {
            return in.readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
