package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.aws.SecretCipher;
import com.cantte.cetus.dian.DianFaultException;
import com.cantte.cetus.dian.NumberingRangeResponse;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.IssuerEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity.VerificationStatus;
import com.cantte.cetus.persistence.entity.SigningCertificateEntity;
import com.cantte.cetus.persistence.entity.SoftwareCredentialEntity;
import com.cantte.cetus.signing.KeyMaterial;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.support.DianClients;
import com.cantte.cetus.worker.support.KeyMaterialCache;
import com.cantte.cetus.worker.support.ProcessingContext;
import com.cantte.cetus.worker.support.ProviderSettings;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.jboss.logging.Logger;

/**
 * Compares an invoice range with the DIAN's record of it (GetNumberingRange): prefix, numbers, validity and
 * technical key. A typo in the technical key makes every CUFE invalid, so this runs before the issuer
 * invoices; a difference is shown in the console and raised as an operational alert. The DIAN portal does not
 * show the technical key, so a range saved without one takes the DIAN's.
 */
@ApplicationScoped
public class VerifyNumberingRangeHandler implements JobHandler {

    private static final Logger LOG = Logger.getLogger(VerifyNumberingRangeHandler.class);

    @Inject
    DianClients dian;

    @Inject
    KeyMaterialCache keyMaterial;

    @Inject
    SecretCipher cipher;

    @Inject
    ProviderSettings provider;

    @Override
    public String type() {
        return JobTypes.VERIFY_NUMBERING_RANGE;
    }

    @Override
    public void handle(JobEntity job) {
        Target target = QuarkusTransaction.requiringNew().call(() -> load(job.referenceId));
        KeyMaterial keys = keyMaterial.get(target.certificate());
        NumberingRangeResponse response;
        try {
            response = dian.forEnvironment(target.environment())
                    .getNumberingRange(target.nit(), provider.providerNit(target.nit()), target.softwareId(), keys);
        } catch (DianFaultException e) {
            if (!e.retryable()) {
                throw new GiveUp("La DIAN rechazó la consulta: " + e.getMessage(), e);
            }
            throw e;
        }
        if (!response.succeeded()) {
            LOG.warnf(
                    "GetNumberingRange for range %s answered %s: %s",
                    job.referenceId, response.operationCode(), response.operationDescription());
            record(
                    job.referenceId,
                    VerificationStatus.ERROR,
                    "La DIAN respondió %s: %s".formatted(response.operationCode(), response.operationDescription()),
                    null);
            return;
        }
        byte[] technicalKeySealed = target.technicalKey() == null
                ? response.find(target.prefix(), target.resolutionNumber())
                        .map(NumberingRangeResponse.Range::technicalKey)
                        .filter(key -> !key.isBlank())
                        .map(cipher::sealText)
                        .orElse(null)
                : null;
        List<String> differences = differences(target, response);
        if (differences.isEmpty()) {
            LOG.infof("Numbering range %s matches the DIAN", job.referenceId);
            record(job.referenceId, VerificationStatus.VERIFIED, null, technicalKeySealed);
        } else {
            LOG.warnf("Numbering range %s differs from the DIAN: %s", job.referenceId, differences);
            record(job.referenceId, VerificationStatus.MISMATCH, String.join("; ", differences), technicalKeySealed);
        }
    }

    @Override
    public void onDead(JobEntity job, String reason) {
        record(job.referenceId, VerificationStatus.ERROR, "No se pudo consultar a la DIAN: " + reason, null);
    }

    private Target load(UUID rangeId) {
        NumberingRangeEntity range = NumberingRangeEntity.findById(rangeId);
        if (range == null) {
            throw new GiveUp("Numbering range " + rangeId + " no longer exists");
        }
        IssuerEntity issuer = IssuerEntity.findById(range.issuerId);
        SoftwareCredentialEntity software = SoftwareCredentialEntity.findActive(issuer.id)
                .orElseThrow(() -> new GiveUp("El emisor no tiene software DIAN registrado"));
        SigningCertificateEntity certificate = SigningCertificateEntity.findActive(issuer.id)
                .orElseThrow(() -> new GiveUp("El emisor no tiene certificado de firma"));
        return new Target(
                issuer.environment,
                issuer.nit,
                software.softwareId,
                new ProcessingContext.CertificateRef(certificate.id, certificate.s3Key, certificate.passwordSealed),
                range.prefix,
                range.resolutionNumber,
                range.rangeFrom,
                range.rangeTo,
                range.validFrom,
                range.validTo,
                range.technicalKeySealed == null ? null : cipher.openText(range.technicalKeySealed));
    }

    private static List<String> differences(Target target, NumberingRangeResponse response) {
        var found = response.find(target.prefix(), target.resolutionNumber());
        if (found.isEmpty()) {
            String known = response.ranges().stream()
                    .map(r -> "%s (resolución %s)"
                            .formatted(
                                    r.prefix() == null || r.prefix().isEmpty() ? "sin prefijo" : r.prefix(),
                                    r.resolutionNumber()))
                    .reduce((a, b) -> a + ", " + b)
                    .orElse("ninguno");
            return List.of("La DIAN no tiene un rango con prefijo %s%s para este software. Rangos de la DIAN: %s"
                    .formatted(
                            target.prefix().isEmpty() ? "vacío" : target.prefix(),
                            target.resolutionNumber() == null ? "" : " y resolución " + target.resolutionNumber(),
                            known));
        }
        NumberingRangeResponse.Range dianRange = found.get();
        List<String> differences = new ArrayList<>();
        compare(differences, "desde", target.from(), dianRange.fromNumber());
        compare(differences, "hasta", target.to(), dianRange.toNumber());
        compare(differences, "vigente desde", target.validFrom(), date(dianRange.validDateFrom()));
        compare(differences, "vigente hasta", target.validTo(), date(dianRange.validDateTo()));
        if (target.technicalKey() != null && !target.technicalKey().equalsIgnoreCase(dianRange.technicalKey())) {
            // Never the keys themselves: they end up in the console and in emails.
            differences.add("la clave técnica no coincide con la de la DIAN");
        }
        if (target.technicalKey() == null
                && (dianRange.technicalKey() == null || dianRange.technicalKey().isBlank())) {
            differences.add("la DIAN no devolvió la clave técnica de este rango");
        }
        return differences;
    }

    private static void compare(List<String> differences, String field, Object ours, Object theirs) {
        if (ours != null && theirs != null && !Objects.equals(ours, theirs)) {
            differences.add("%s: Cetus %s, DIAN %s".formatted(field, ours, theirs));
        }
    }

    private static LocalDate date(String value) {
        if (value == null || value.length() < 10) {
            return null;
        }
        try {
            return LocalDate.parse(value.substring(0, 10));
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static void record(UUID rangeId, VerificationStatus status, String error, byte[] technicalKeySealed) {
        QuarkusTransaction.requiringNew().run(() -> {
            NumberingRangeEntity range = NumberingRangeEntity.findById(rangeId);
            if (range == null) {
                return;
            }
            if (technicalKeySealed != null && range.technicalKeySealed == null) {
                range.technicalKeySealed = technicalKeySealed;
            }
            range.verificationStatus = status;
            range.verificationError = error;
            range.verifiedAt = OffsetDateTime.now();
        });
    }

    private record Target(
            Environment environment,
            String nit,
            String softwareId,
            ProcessingContext.CertificateRef certificate,
            String prefix,
            String resolutionNumber,
            long from,
            long to,
            LocalDate validFrom,
            LocalDate validTo,
            String technicalKey) {}
}
