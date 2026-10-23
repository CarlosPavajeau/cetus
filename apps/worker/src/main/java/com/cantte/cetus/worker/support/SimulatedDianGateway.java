package com.cantte.cetus.worker.support;

import com.cantte.cetus.dian.DianGateway;
import com.cantte.cetus.dian.DianResponse;
import com.cantte.cetus.dian.NumberingRangeResponse;
import com.cantte.cetus.dian.UploadResponse;
import com.cantte.cetus.dian.simulated.SimulatedDian;
import com.cantte.cetus.dian.simulated.SimulatedDocument;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.persistence.entity.DianSubmissionEntity;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity.Kind;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.signing.KeyMaterial;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The DIAN of the SANDBOX environment: {@link SimulatedDian} answers, and the documents it needs to
 * remember (how many times one was sent, what a CUFE belongs to) are read from Cetus' own records.
 * Sandbox documents never use test sets or verify ranges, so only SendBillSync and GetStatus answer.
 */
@ApplicationScoped
public class SimulatedDianGateway implements DianGateway {

    @Inject
    ArtifactStore artifacts;

    private final Clock clock = Clock.systemUTC();

    @Override
    public DianResponse sendBillSync(String zipFileName, byte[] zip, KeyMaterial keys) {
        SimulatedDocument document = SimulatedDocument.fromZip(zip);
        int previousSends = documentId(document.uniqueCode()).map(SimulatedDianGateway::sends).orElse(0);
        return new SimulatedDian(keys, clock).sendBillSync(document, previousSends);
    }

    @Override
    public DianResponse getStatus(String trackId, KeyMaterial keys) {
        Optional<UUID> documentId = documentId(trackId);
        Optional<SimulatedDocument> document = documentId.flatMap(id -> artifacts.latest(id, Kind.SIGNED_XML))
                .map(xml -> SimulatedDocument.fromXml(xml.fileName().replaceFirst("\\.xml$", ""), xml.content()));
        int previousSends = documentId.map(SimulatedDianGateway::sends).orElse(0);
        return new SimulatedDian(keys, clock).getStatus(trackId, document, previousSends);
    }

    @Override
    public UploadResponse sendTestSetAsync(String zipFileName, byte[] zip, String testSetId, KeyMaterial keys) {
        throw new UnsupportedOperationException("The sandbox has no test sets");
    }

    @Override
    public List<DianResponse> getStatusZip(String zipKey, KeyMaterial keys) {
        throw new UnsupportedOperationException("The sandbox has no test sets");
    }

    @Override
    public NumberingRangeResponse getNumberingRange(String accountCode, String accountCodeT, String softwareCode,
                                                    KeyMaterial keys) {
        throw new UnsupportedOperationException("Sandbox ranges are not verified with the DIAN");
    }

    private static Optional<UUID> documentId(String uniqueCode) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentEntity.<DocumentEntity>find(
                        "cufe = ?1 and environment = ?2", uniqueCode, Environment.SANDBOX)
                .firstResultOptional().map(doc -> doc.id));
    }

    private static int sends(UUID documentId) {
        return QuarkusTransaction.requiringNew().call(() -> (int) DianSubmissionEntity.count(
                "documentId = ?1 and operation = 'SendBillSync'", documentId));
    }
}
