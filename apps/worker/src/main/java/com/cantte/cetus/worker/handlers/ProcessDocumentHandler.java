package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.aws.SecretCipher;
import com.cantte.cetus.dian.DianFaultException;
import com.cantte.cetus.dian.DianResponse;
import com.cantte.cetus.dian.DianSoapClient;
import com.cantte.cetus.dian.DianTransportException;
import com.cantte.cetus.dian.DianZip;
import com.cantte.cetus.dian.UploadResponse;
import com.cantte.cetus.domain.dian.DianFileNames;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.FileSequence;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity.Kind;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.signing.KeyMaterial;
import com.cantte.cetus.signing.XadesSigner;
import com.cantte.cetus.signing.XmlSupport;
import com.cantte.cetus.ubl.UblMarshaller;
import com.cantte.cetus.worker.builders.BuiltDocument;
import com.cantte.cetus.worker.builders.DocumentBuilder;
import com.cantte.cetus.worker.builders.DocumentSecrets;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.support.ArtifactStore;
import com.cantte.cetus.worker.support.ContextLoader;
import com.cantte.cetus.worker.support.DianClients;
import com.cantte.cetus.worker.support.KeyMaterialCache;
import com.cantte.cetus.worker.support.ProcessingContext;
import com.cantte.cetus.worker.support.ProviderSettings;
import com.cantte.cetus.worker.support.ResultRecorder;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;
import org.w3c.dom.Document;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Full pipeline for one document: CUFE/CUDE → UBL → XAdES signature → zip → DIAN → result. Only the
 * first two steps depend on the document type; each type has its {@link DocumentBuilder}.
 *
 * <p>Idempotency towards the DIAN: if the previous attempt got no answer (timeout, I/O error, HTTP
 * error or SOAP fault), the document may already be registered, so the status is queried with the
 * CUFE or CUDE before sending again.
 */
@ApplicationScoped
public class ProcessDocumentHandler implements JobHandler {

    private static final Logger LOG = Logger.getLogger(ProcessDocumentHandler.class);

    private final XadesSigner signer = new XadesSigner();

    @Inject
    ContextLoader loader;
    @Inject
    ResultRecorder recorder;
    @Inject
    ArtifactStore artifacts;
    @Inject
    KeyMaterialCache keyCache;
    @Inject
    DianClients dianClients;
    @Inject
    SecretCipher cipher;
    @Inject
    FileSequence fileSequence;
    @Inject
    ProviderSettings provider;
    @Inject
    Instance<DocumentBuilder> builderInstances;

    private Map<DocumentType, DocumentBuilder> builders;

    @PostConstruct
    void init() {
        builders = builderInstances.stream().collect(Collectors.toMap(DocumentBuilder::type, Function.identity()));
    }

    @Override
    public String type() {
        return JobTypes.PROCESS_DOCUMENT;
    }

    @Override
    public void handle(JobEntity job) {
        Optional<ProcessingContext> loaded = loader.startProcessing(job.referenceId);
        if (loaded.isEmpty()) {
            return;
        }
        ProcessingContext ctx = loaded.get();
        DocumentBuilder builder = builders.get(ctx.documentType());
        if (builder == null) {
            recorder.gaveUp(ctx.documentId(), "Document type not supported yet: " + ctx.documentType());
            return;
        }

        KeyMaterial keys = keyCache.get(ctx.certificate());
        DianSoapClient dian = dianClients.forEnvironment(ctx.environment());
        boolean testSet = ctx.environment() == Environment.TEST && ctx.testSetId() != null;

        if (!testSet && ctx.lastSendUnanswered() && ctx.existingCufe() != null && alreadyRegistered(ctx, dian, keys)) {
            return;
        }

        String pin = cipher.openText(ctx.pinSealed());
        String technicalKey = ctx.technicalKeySealed() == null ? "" : cipher.openText(ctx.technicalKeySealed());
        BuiltDocument built = builder.build(ctx, new DocumentSecrets(pin, technicalKey));
        recorder.cufe(ctx.documentId(), built.uniqueCode());

        byte[] signedXml = sign(built.unsigned(), keys);
        long sequence = fileSequence.next(ctx.issuerId(), ctx.issueDate().getYear());
        String nit = ctx.supplier().identificationNumber();
        String xmlName = DianFileNames.xml(ctx.documentType(), nit, provider.fileCode(), ctx.issueDate().getYear(), sequence);
        String zipName = DianFileNames.zip(nit, provider.fileCode(), ctx.issueDate().getYear(), sequence);
        byte[] zip = DianZip.single(xmlName, signedXml);

        artifacts.save(ctx, Kind.SIGNED_XML, xmlName, signedXml, "application/xml");
        artifacts.save(ctx, Kind.ZIP, zipName, zip, "application/zip");

        if (testSet) {
            sendTestSet(ctx, dian, keys, zipName, zip);
        } else {
            sendSync(ctx, dian, keys, zipName, zip);
        }
    }

    @Override
    public void onDead(JobEntity job, String reason) {
        recorder.gaveUp(job.referenceId, "Gave up after " + job.attempts + " attempts: " + reason);
    }

    private byte[] sign(Document document, KeyMaterial keys) {
        signer.sign(document, UblMarshaller.signatureSlot(document), keys, XadesSigner.SignerRole.SUPPLIER);
        return XmlSupport.serialize(document);
    }

    private void sendSync(ProcessingContext ctx, DianSoapClient dian, KeyMaterial keys, String zipName, byte[] zip) {
        long start = System.currentTimeMillis();
        DianResponse response;
        try {
            response = dian.sendBillSync(zipName, zip, keys);
        } catch (DianTransportException e) {
            recorder.submission(ctx.documentId(), "SendBillSync", null, e.isTimeout(), null,
                    List.of(e.getMessage()), System.currentTimeMillis() - start);
            throw e;
        } catch (DianFaultException e) {
            recordFault(ctx, "SendBillSync", e, start);
            throw escalate(e);
        }
        recorder.submission(ctx.documentId(), "SendBillSync", null, false, response, response.errors(),
                System.currentTimeMillis() - start);
        storeResponse(ctx, response);
        recorder.completed(ctx.documentId(), response);
        LOG.infof("Document %s %s by DIAN (%s)", ctx.fullNumber(), response.valid() ? "accepted" : "rejected",
                response.statusCode());
    }

    private void sendTestSet(ProcessingContext ctx, DianSoapClient dian, KeyMaterial keys, String zipName, byte[] zip) {
        long start = System.currentTimeMillis();
        UploadResponse upload;
        try {
            upload = dian.sendTestSetAsync(zipName, zip, ctx.testSetId(), keys);
        } catch (DianTransportException e) {
            recorder.submission(ctx.documentId(), "SendTestSetAsync", null, e.isTimeout(), null,
                    List.of(e.getMessage()), System.currentTimeMillis() - start);
            throw e;
        } catch (DianFaultException e) {
            recordFault(ctx, "SendTestSetAsync", e, start);
            throw escalate(e);
        }
        recorder.submission(ctx.documentId(), "SendTestSetAsync", upload.zipKey(), false, null, upload.errors(),
                System.currentTimeMillis() - start);
        if (upload.zipKey() == null) {
            recorder.gaveUp(ctx.documentId(), "DIAN did not return a ZipKey: " + String.join("; ", upload.errors()));
            return;
        }
        recorder.submitted(ctx.documentId(), upload.zipKey());
    }

    private boolean alreadyRegistered(ProcessingContext ctx, DianSoapClient dian, KeyMaterial keys) {
        DianResponse status = dian.getStatus(ctx.existingCufe(), keys);
        recorder.submission(ctx.documentId(), "GetStatus", ctx.existingCufe(), false, status, status.errors(), 0);
        if (status.valid()) {
            storeResponse(ctx, status);
            recorder.completed(ctx.documentId(), status);
            return true;
        }
        return false;
    }

    private void storeResponse(ProcessingContext ctx, DianResponse response) {
        artifacts.save(ctx, Kind.DIAN_RESPONSE, "dian-response.xml",
                response.rawXml().getBytes(StandardCharsets.UTF_8), "application/xml");
        if (response.applicationResponse() != null) {
            artifacts.save(ctx, Kind.APPLICATION_RESPONSE, "application-response.xml",
                    Base64.getDecoder().decode(response.applicationResponse()), "application/xml");
        }
    }

    private void recordFault(ProcessingContext ctx, String operation, DianFaultException e, long start) {
        recorder.submission(ctx.documentId(), operation, null, false, null, List.of(e.getMessage()),
                System.currentTimeMillis() - start);
        artifacts.save(ctx, Kind.DIAN_RESPONSE, "dian-fault-" + System.currentTimeMillis() + ".xml",
                e.rawXml().getBytes(StandardCharsets.UTF_8), "application/xml");
        recorder.failed(ctx.documentId(), "DIAN fault: " + e.getMessage());
    }

    /** A client fault repeats on every attempt and burns a file sequence each time, so stop retrying. */
    static RuntimeException escalate(DianFaultException e) {
        return e.retryable() ? e : new GiveUp("DIAN fault: " + e.getMessage(), e);
    }
}
