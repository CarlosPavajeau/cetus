package com.cantte.cetus.api.console;

import com.cantte.cetus.api.invoices.InvoiceRequest;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

/**
 * Issuers of the SANDBOX environment. They are ready as soon as they exist: the simulator signs with
 * Cetus' sandbox credentials, so they never get software, a certificate or ranges of their own; each one
 * gets a wide range per document type instead. Every account starts with a sample issuer, and can add
 * its own with real tax data to see its documents as they will look.
 */
@ApplicationScoped
public class SandboxIssuers {

    /** Made up, with a valid check digit (4), so the sample never stands for a real company. */
    static final String SAMPLE_NIT = "900999999";

    private static final ZoneId COLOMBIA = ZoneId.of("America/Bogota");

    @Inject
    IssuerOnboardingService onboarding;

    /**
     * Creates the sample issuer of a new account. It comes with the account, so the caller records it in
     * the account's creation instead of as an issuer someone created.
     */
    @Transactional(Transactional.TxType.MANDATORY)
    public IssuerEntity createSample(UUID accountId) {
        return onboarding.persist(accountId, sample());
    }

    /** Leaves a new sandbox issuer ready to issue every document type. */
    @Transactional(Transactional.TxType.MANDATORY)
    void enable(IssuerEntity issuer) {
        issuer.status = IssuerEntity.Status.ENABLED;
        LocalDate today = LocalDate.now(COLOMBIA);
        range(issuer, DocumentType.INVOICE, "SIM", "18760000001", today);
        range(issuer, DocumentType.CREDIT_NOTE, "NCS", null, today);
        range(issuer, DocumentType.DEBIT_NOTE, "NDS", null, today);
    }

    private static void range(IssuerEntity issuer, DocumentType type, String prefix, String resolution,
                              LocalDate today) {
        NumberingRangeEntity range = new NumberingRangeEntity();
        range.id = Ids.newId();
        range.issuerId = issuer.id;
        range.documentType = type;
        range.resolutionNumber = resolution;
        range.resolutionDate = resolution == null ? null : today;
        range.prefix = prefix;
        range.rangeFrom = 1;
        range.rangeTo = 999_999_999;
        range.nextNumber = 1;
        range.validFrom = today;
        range.validTo = today.plusYears(10);
        range.persist();
    }

    private static IssuerViews.CreateIssuerRequest sample() {
        return new IssuerViews.CreateIssuerRequest(Environment.SANDBOX, SAMPLE_NIT, null, "Empresa de Ejemplo SAS",
                "Ejemplo", PersonType.LEGAL_ENTITY, List.of("O-13"), true,
                new InvoiceRequest.AddressInput("11001", "Bogotá, D.C.", "11", "Bogotá", "110111",
                        "Carrera 7 # 71-21", "CO", "Colombia"),
                "facturas@example.com", null);
    }
}
