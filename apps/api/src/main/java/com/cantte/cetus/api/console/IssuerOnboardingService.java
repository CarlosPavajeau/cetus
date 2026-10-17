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
import java.util.Map;
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
        issuer.legalName = request.legalName();
        issuer.tradeName = request.tradeName();
        issuer.personType = request.personType();
        issuer.taxLevelCodes = String.join(";", request.taxLevelCodes());
        issuer.taxSchemeId = request.responsibleForIva() ? "01" : "ZZ";
        issuer.taxSchemeName = request.responsibleForIva() ? "IVA" : "No aplica";
        issuer.address = request.address();
        issuer.email = request.email();
        issuer.phone = request.phone();
        issuer.operationMode = IssuerEntity.OperationMode.OWN_SOFTWARE;
        issuer.persist();
        audit(issuer, actor, origin, AuditAction.ISSUER_CREATED, Map.of(
                "nit", issuer.nit,
                "environment", issuer.environment,
                "personType", issuer.personType));
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

    private void audit(IssuerEntity issuer, Actor actor, RequestOrigin origin, AuditAction action,
                       Map<String, Object> data) {
        auditLog.record(issuer.accountId, actor, origin, action, "issuer", issuer.id, data);
    }
}
