package com.cantte.cetus.api.console;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.aws.SecretCipher;
import com.cantte.cetus.domain.DomainException;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.dian.Hashing;
import com.cantte.cetus.domain.dian.NitCheckDigit;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.audit.AuditAction;
import com.cantte.cetus.persistence.audit.AuditLog;
import com.cantte.cetus.persistence.audit.RequestOrigin;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import com.cantte.cetus.persistence.entity.SigningCertificateEntity;
import com.cantte.cetus.persistence.entity.SoftwareCredentialEntity;
import com.cantte.cetus.signing.KeyMaterial;
import com.cantte.cetus.signing.Pkcs12Loader;
import com.cantte.cetus.signing.SigningException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

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

    @Transactional
    public IssuerEntity create(UUID accountId, IssuerViews.CreateIssuerRequest request, Actor actor,
                               RequestOrigin origin) {
        String checkDigit = NitCheckDigit.compute(request.nit());
        if (request.checkDigit() != null && !request.checkDigit().equals(checkDigit)) {
            throw new DomainException("check_digit_invalid", "The NIT check digit does not match (expected " + checkDigit + ")");
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
        audit(issuer, actor, origin, AuditAction.ISSUER_CREATED, Map.of(
                "nit", issuer.nit,
                "environment", issuer.environment,
                "personType", issuer.personType));
        return issuer;
    }

    /**
     * Updates the tax data of an issuer that is still being set up. The NIT and the environment
     * identify the issuer and cannot change; once it is in habilitación or production it is locked.
     */
    @Transactional
    public IssuerEntity update(IssuerEntity issuer, IssuerViews.UpdateIssuerRequest request, Actor actor,
                               RequestOrigin origin) {
        if (issuer.status != IssuerEntity.Status.ONBOARDING) {
            throw new DomainException("issuer_locked", "The issuer can only be edited while it is being set up");
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
        byte[] pkcs12 = Base64.getDecoder().decode(request.pkcs12Base64());
        KeyMaterial keys;
        try {
            keys = Pkcs12Loader.load(pkcs12, request.password().toCharArray());
        } catch (SigningException e) {
            throw new DomainException("certificate_invalid", e.getMessage());
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
     * Starts the production issuer of a test issuer that finished habilitación: same NIT and tax
     * data, the same DIAN software (production keeps its ID and PIN, without a test set) and, when it
     * has one, a copy of its certificate. Only the production numbering is left, so the new issuer
     * stays in setup. Habilitación itself happens in the DIAN portal; Cetus cannot verify it.
     */
    @Transactional
    public IssuerEntity promote(IssuerEntity test, Actor actor, RequestOrigin origin) {
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
        boolean ready = SoftwareCredentialEntity.findActive(issuer.id).isPresent()
                && SigningCertificateEntity.findActive(issuer.id).isPresent()
                && NumberingRangeEntity.count("issuerId = ?1 and status = 'ACTIVE'", issuer.id) > 0;
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
        issuer.address = request.address();
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
