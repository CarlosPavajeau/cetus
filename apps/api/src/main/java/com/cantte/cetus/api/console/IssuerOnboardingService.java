package com.cantte.cetus.api.console;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.aws.SecretCipher;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.dian.Hashing;
import com.cantte.cetus.domain.dian.NitCheckDigit;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.jobs.JobQueue;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.audit.RequestOrigin;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity.VerificationStatus;
import com.cantte.cetus.persistence.entity.SigningCertificateEntity;
import com.cantte.cetus.persistence.entity.SoftwareCredentialEntity;
import com.cantte.cetus.signing.KeyMaterial;
import com.cantte.cetus.signing.Pkcs12Loader;
import com.cantte.cetus.signing.SigningException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Issuer setup: tax data, DIAN software credentials, certificate and numbering ranges.
 * Every change is audited; the audit data never includes the PIN, the certificate or its
 * password, nor the technical key.
 */
@ApplicationScoped
public class IssuerOnboardingService {

    @Inject
    SecretCipher cipher;
    @Inject
    DocumentStorage storage;
    @Inject
    AuditLog auditLog;
    @Inject
    JobQueue jobs;
    @Inject
    SandboxIssuers sandboxIssuers;
    @ConfigProperty(name = "cetus.sandbox.max-issuers")
    int sandboxMaxIssuers;

    @Transactional
    public IssuerEntity create(UUID accountId, IssuerViews.CreateIssuerRequest request, Actor actor,
                               RequestOrigin origin) {
        IssuerEntity issuer = persist(accountId, request);
        audit(issuer, actor, origin, AuditAction.ISSUER_CREATED, Map.of(
                "nit", issuer.nit,
                "environment", issuer.environment,
                "personType", issuer.personType));
        return issuer;
    }

    /** Creates the issuer without auditing it, for the caller that records it as part of something else. */
    @Transactional(Transactional.TxType.MANDATORY)
    IssuerEntity persist(UUID accountId, IssuerViews.CreateIssuerRequest request) {
        String checkDigit = NitCheckDigit.compute(request.nit());
        if (request.checkDigit() != null && !request.checkDigit().equals(checkDigit)) {
            throw new DomainException("check_digit_invalid", "The NIT check digit does not match (expected " + checkDigit + ")");
        }
        if (request.environment() == Environment.SANDBOX) {
            requireSandboxIssuerSlot(accountId);
        }
        boolean exists = IssuerEntity.count("accountId = ?1 and environment = ?2 and nit = ?3",
                accountId, request.environment(), request.nit()) > 0;
        if (exists) {
            throw new DomainException("issuer_already_exists", "This NIT already has an issuer in " + request.environment());
        }
        IssuerEntity issuer = new IssuerEntity();
        issuer.id = Ids.newId();
        issuer.accountId = accountId;
        issuer.environment = request.environment();
        issuer.nit = request.nit();
        issuer.checkDigit = checkDigit;
        apply(issuer, new IssuerViews.UpdateIssuerRequest(request.legalName(), request.tradeName(),
                request.personType(), request.taxLevelCodes(), request.responsibleForIva(), request.address(),
                request.email(), request.phone()));
        issuer.operationMode = IssuerEntity.OperationMode.OWN_SOFTWARE;
        issuer.persist();
        if (issuer.environment == Environment.SANDBOX) {
            sandboxIssuers.enable(issuer);
        }
        return issuer;
    }

    /**
     * Sandbox issuers are free, so an account has at most {@code cetus.sandbox.max-issuers}, the sample included.
     * A lock per account until the transaction ends keeps two requests from both taking the last one.
     */
    private void requireSandboxIssuerSlot(UUID accountId) {
        IssuerEntity.getEntityManager()
                .createNativeQuery("SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(:key, 0))")
                .setParameter("key", "sandbox-issuers:" + accountId)
                .getSingleResult();
        long issuers = IssuerEntity.count("accountId = ?1 and environment = ?2", accountId, Environment.SANDBOX);
        if (issuers >= sandboxMaxIssuers) {
            throw new DomainException("sandbox_issuer_limit",
                    "This account already has its " + sandboxMaxIssuers + " sandbox issuers");
        }
    }

    /**
     * Updates the tax data of an issuer, at any stage: the RUT changes (address, responsibilities,
     * name) and the documents must follow it. The NIT and the environment identify the issuer and
     * never change. The person type comes with the NIT, so it can only be fixed during the setup.
     * Documents not yet sent to the DIAN go out with the new data.
     */
    @Transactional
    public IssuerEntity update(IssuerEntity issuer, IssuerViews.UpdateIssuerRequest request, Actor actor,
                               RequestOrigin origin) {
        if (issuer.status != IssuerEntity.Status.ONBOARDING && request.personType() != issuer.personType) {
            throw new DomainException("person_type_locked",
                    "The person type can only change while the issuer is being set up");
        }
        Map<String, Object> before = snapshot(issuer);
        apply(issuer, request);
        Map<String, Object> after = snapshot(issuer);
        List<String> changed = after.keySet().stream()
                .filter(field -> !Objects.equals(before.get(field), after.get(field)))
                .toList();
        if (!changed.isEmpty()) {
            audit(issuer, actor, origin, AuditAction.ISSUER_UPDATED, Map.of("fields", changed));
        }
        return issuer;
    }

    @Transactional
    public void setSoftware(IssuerEntity issuer, IssuerViews.SoftwareRequest request, Actor actor,
                            RequestOrigin origin) {
        requireOwnSetup(issuer);
        SoftwareCredentialEntity.deactivateAll(issuer.id);
        SoftwareCredentialEntity credential = new SoftwareCredentialEntity();
        credential.id = Ids.newId();
        credential.issuerId = issuer.id;
        credential.softwareId = request.softwareId();
        credential.pinSealed = cipher.sealText(request.pin());
        credential.testSetId = request.testSetId();
        credential.persist();
        audit(issuer, actor, origin, AuditAction.SOFTWARE_CREDENTIALS_SET, Map.of(
                "softwareId", credential.softwareId,
                "hasTestSet", credential.testSetId != null && !credential.testSetId.isBlank()));
        refreshStatus(issuer, actor, origin);
    }

    /** Validates the PKCS#12, stores it sealed in S3 and keeps only metadata in the database. */
    @Transactional
    public SigningCertificateEntity setCertificate(IssuerEntity issuer, IssuerViews.CertificateRequest request,
                                                   Actor actor, RequestOrigin origin) {
        requireOwnSetup(issuer);
        byte[] pkcs12;
        try {
            pkcs12 = Base64.getDecoder().decode(request.pkcs12Base64());
        } catch (IllegalArgumentException e) {
            throw new DomainException("certificate_invalid", "The certificate is not valid base64");
        }
        KeyMaterial keys;
        try {
            keys = Pkcs12Loader.loadUntrusted(pkcs12, request.password().toCharArray());
        } catch (SigningException e) {
            // Low-level keystore errors stay out of the response; only our own messages are shown.
            throw new DomainException("certificate_invalid", e.getCause() == null ? e.getMessage()
                    : "Could not read the PKCS#12 file: check the file and its password");
        }
        var certificate = keys.certificate();
        OffsetDateTime validTo = certificate.getNotAfter().toInstant().atOffset(ZoneOffset.UTC);
        if (validTo.isBefore(OffsetDateTime.now())) {
            throw new DomainException("certificate_expired", "The certificate expired on " + validTo.toLocalDate());
        }

        SigningCertificateEntity.deactivateAll(issuer.id);
        SigningCertificateEntity entity = new SigningCertificateEntity();
        entity.id = Ids.newId();
        entity.issuerId = issuer.id;
        entity.s3Key = "certificates/" + issuer.id + "/" + entity.id + ".p12.sealed";
        storage.put(entity.s3Key, cipher.seal(pkcs12), "application/octet-stream");
        entity.passwordSealed = cipher.sealText(request.password());
        entity.subjectDn = certificate.getSubjectX500Principal().getName();
        entity.issuerDn = certificate.getIssuerX500Principal().getName();
        entity.serialNumber = certificate.getSerialNumber().toString();
        try {
            entity.fingerprintSha256 = Hashing.sha256Hex(certificate.getEncoded());
        } catch (Exception e) {
            throw new DomainException("certificate_invalid", "Could not read the certificate");
        }
        entity.validFrom = certificate.getNotBefore().toInstant().atOffset(ZoneOffset.UTC);
        entity.validTo = validTo;
        entity.persist();
        audit(issuer, actor, origin, AuditAction.CERTIFICATE_UPLOADED, Map.of(
                "certificateId", entity.id,
                "subject", entity.subjectDn,
                "serialNumber", entity.serialNumber,
                "validTo", entity.validTo,
                "fingerprintSha256", entity.fingerprintSha256));
        refreshStatus(issuer, actor, origin);
        return entity;
    }

    @Transactional
    public NumberingRangeEntity addRange(IssuerEntity issuer, IssuerViews.NumberingRangeRequest request, Actor actor,
                                         RequestOrigin origin) {
        requireOwnSetup(issuer);
        if (request.from() > request.to()) {
            throw new DomainException("range_invalid", "'from' must be lower than or equal to 'to'");
        }
        NumberingRangeEntity range = new NumberingRangeEntity();
        range.id = Ids.newId();
        range.issuerId = issuer.id;
        range.documentType = request.documentType();
        range.resolutionNumber = request.resolutionNumber();
        range.resolutionDate = request.resolutionDate();
        range.prefix = request.prefix() == null ? "" : request.prefix();
        range.rangeFrom = request.from();
        range.rangeTo = request.to();
        range.nextNumber = request.from();
        range.validFrom = request.validFrom();
        range.validTo = request.validTo();
        if (request.technicalKey() != null) {
            range.technicalKeySealed = cipher.sealText(request.technicalKey());
        }
        range.persist();
        // HashMap: validTo is optional and Map.of rejects nulls.
        Map<String, Object> data = new HashMap<>();
        data.put("rangeId", range.id);
        data.put("documentType", range.documentType);
        data.put("prefix", range.prefix);
        data.put("from", range.rangeFrom);
        data.put("to", range.rangeTo);
        data.put("validTo", range.validTo);
        audit(issuer, actor, origin, AuditAction.NUMBERING_RANGE_ADDED, data);
        refreshStatus(issuer, actor, origin);
        return range;
    }

    /**
     * Compares a production invoice range with the DIAN again (GetNumberingRange), e.g. after fixing its
     * technical key or the DIAN software. It is also requested on its own once a production issuer has
     * software and certificate.
     */
    @Transactional
    public NumberingRangeEntity verifyRange(IssuerEntity issuer, UUID rangeId) {
        requireOwnSetup(issuer);
        NumberingRangeEntity range = NumberingRangeEntity.<NumberingRangeEntity>find("id = ?1 and issuerId = ?2", rangeId, issuer.id)
                .firstResultOptional()
                .orElseThrow(() -> new NotFoundException("Numbering range not found"));
        if (range.documentType != DocumentType.INVOICE) {
            throw new DomainException("range_not_verifiable", "Only invoice ranges are authorized by the DIAN");
        }
        if (issuer.environment != Environment.LIVE) {
            throw new DomainException("range_not_verifiable",
                    "Habilitación uses the DIAN's shared test range, which is not registered per NIT");
        }
        if (!canSign(issuer)) {
            throw new DomainException("issuer_not_ready", "The issuer needs its DIAN software and certificate first");
        }
        if (range.verificationStatus != VerificationStatus.PENDING) {
            requestVerification(range);
        }
        return range;
    }

    /** Sandbox issuers sign and number with what Cetus gives them, so their setup never changes. */
    private static void requireOwnSetup(IssuerEntity issuer) {
        if (issuer.environment == Environment.SANDBOX) {
            throw new DomainException("sandbox_issuer",
                    "Sandbox issuers use Cetus' sandbox credentials and numbering; they need no setup");
        }
    }

    private static boolean canSign(IssuerEntity issuer) {
        return SoftwareCredentialEntity.findActive(issuer.id).isPresent()
                && SigningCertificateEntity.findActive(issuer.id).isPresent();
    }

    private void requestVerification(NumberingRangeEntity range) {
        range.verificationStatus = VerificationStatus.PENDING;
        range.verificationError = null;
        jobs.enqueue(JobTypes.VERIFY_NUMBERING_RANGE, range.id);
    }

    /**
     * Starts the production issuer of a test issuer that finished habilitación: same NIT and tax
     * data, the same DIAN software (production keeps its ID and PIN, without a test set) and, when it
     * has one, a copy of its certificate. Only the production numbering is left, so the new issuer
     * stays in setup. Habilitación itself happens in the DIAN portal; Cetus cannot verify it.
     */
    @Transactional
    public IssuerEntity promote(IssuerEntity test, Actor actor, RequestOrigin origin) {
        requireOwnSetup(test);
        if (test.environment != Environment.TEST || test.status != IssuerEntity.Status.TESTING) {
            throw new DomainException("issuer_not_promotable",
                    "Only a test issuer in habilitación can be promoted to production");
        }
        boolean promoted = IssuerEntity.count("accountId = ?1 and environment = ?2 and nit = ?3",
                test.accountId, Environment.LIVE, test.nit) > 0;
        if (promoted) {
            throw new DomainException("issuer_already_promoted", "This NIT already has a production issuer");
        }

        IssuerEntity live = new IssuerEntity();
        live.id = Ids.newId();
        live.accountId = test.accountId;
        live.environment = Environment.LIVE;
        live.nit = test.nit;
        live.checkDigit = test.checkDigit;
        live.legalName = test.legalName;
        live.tradeName = test.tradeName;
        live.personType = test.personType;
        live.taxLevelCodes = test.taxLevelCodes;
        live.taxSchemeId = test.taxSchemeId;
        live.taxSchemeName = test.taxSchemeName;
        live.address = test.address;
        live.email = test.email;
        live.phone = test.phone;
        live.operationMode = test.operationMode;
        live.persist();

        SoftwareCredentialEntity.findActive(test.id).ifPresent(software -> {
            SoftwareCredentialEntity copy = new SoftwareCredentialEntity();
            copy.id = Ids.newId();
            copy.issuerId = live.id;
            copy.softwareId = software.softwareId;
            copy.pinSealed = software.pinSealed;
            copy.persist();
        });
        boolean certificateCopied = SigningCertificateEntity.findActive(test.id)
                .filter(certificate -> certificate.validTo.isAfter(OffsetDateTime.now()))
                .map(certificate -> {
                    SigningCertificateEntity copy = new SigningCertificateEntity();
                    copy.id = Ids.newId();
                    copy.issuerId = live.id;
                    copy.s3Key = "certificates/" + live.id + "/" + copy.id + ".p12.sealed";
                    // Still sealed: the bytes are copied as they are, never opened.
                    storage.put(copy.s3Key, storage.get(certificate.s3Key), "application/octet-stream");
                    copy.passwordSealed = certificate.passwordSealed;
                    copy.subjectDn = certificate.subjectDn;
                    copy.issuerDn = certificate.issuerDn;
                    copy.serialNumber = certificate.serialNumber;
                    copy.fingerprintSha256 = certificate.fingerprintSha256;
                    copy.validFrom = certificate.validFrom;
                    copy.validTo = certificate.validTo;
                    copy.persist();
                    return true;
                })
                .orElse(false);

        audit(test, actor, origin, AuditAction.ISSUER_PROMOTED, Map.of("liveIssuerId", live.id));
        audit(live, actor, origin, AuditAction.ISSUER_CREATED, Map.of(
                "nit", live.nit,
                "environment", live.environment,
                "personType", live.personType,
                "promotedFrom", test.id,
                "certificateCopied", certificateCopied));
        return live;
    }

    /**
     * An issuer with software, certificate and an active range is ready: TESTING in the test
     * environment (habilitación) or ENABLED in production. Habilitación itself happens in the
     * DIAN portal; mark LIVE issuers carefully. A status change is audited.
     */
    private void refreshStatus(IssuerEntity issuer, Actor actor, RequestOrigin origin) {
        boolean canSign = canSign(issuer);
        boolean ready = canSign && NumberingRangeEntity.count("issuerId = ?1 and status = 'ACTIVE'", issuer.id) > 0;
        // Habilitación numbers from a shared test range (SETP) the DIAN does not register per NIT, so
        // GetNumberingRange only answers for production resolutions.
        if (canSign && issuer.environment == Environment.LIVE) {
            NumberingRangeEntity.<NumberingRangeEntity>list("issuerId = ?1 and documentType = ?2 and status = 'ACTIVE' "
                    + "and verificationStatus is null", issuer.id, DocumentType.INVOICE).forEach(this::requestVerification);
        }
        if (ready && issuer.status == IssuerEntity.Status.ONBOARDING) {
            IssuerEntity.Status previous = issuer.status;
            issuer.status = issuer.environment == Environment.TEST
                    ? IssuerEntity.Status.TESTING
                    : IssuerEntity.Status.ENABLED;
            audit(issuer, actor, origin, AuditAction.ISSUER_STATUS_CHANGED,
                    Map.of("from", previous, "to", issuer.status));
        }
    }

    private static void apply(IssuerEntity issuer, IssuerViews.UpdateIssuerRequest request) {
        issuer.legalName = request.legalName();
        issuer.tradeName = request.tradeName();
        issuer.personType = request.personType();
        issuer.taxLevelCodes = String.join(";", request.taxLevelCodes());
        issuer.taxSchemeId = request.responsibleForIva() ? "01" : "ZZ";
        issuer.taxSchemeName = request.responsibleForIva() ? "IVA" : "No aplica";
        issuer.address = request.address().toAddress();
        issuer.email = request.email();
        issuer.phone = request.phone();
    }

    /** The editable fields, keyed by their request name, to audit which ones changed (never their values). */
    private static Map<String, Object> snapshot(IssuerEntity issuer) {
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("legalName", issuer.legalName);
        fields.put("tradeName", issuer.tradeName);
        fields.put("personType", issuer.personType);
        fields.put("taxLevelCodes", issuer.taxLevelCodes);
        fields.put("responsibleForIva", issuer.taxSchemeId);
        fields.put("address", issuer.address);
        fields.put("email", issuer.email);
        fields.put("phone", issuer.phone);
        return fields;
    }

    private void audit(IssuerEntity issuer, Actor actor, RequestOrigin origin, AuditAction action,
                       Map<String, Object> data) {
        auditLog.record(issuer.accountId, actor, origin, action, "issuer", issuer.id, data);
    }
}
