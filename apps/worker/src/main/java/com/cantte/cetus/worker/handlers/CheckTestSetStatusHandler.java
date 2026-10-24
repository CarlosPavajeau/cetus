package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.dian.DianFaultException;
import com.cantte.cetus.dian.DianResponse;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity.Kind;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.signing.KeyMaterial;
import com.cantte.cetus.worker.runner.JobHandler;
import com.cantte.cetus.worker.runner.RetryLater;
import com.cantte.cetus.worker.support.ArtifactStore;
import com.cantte.cetus.worker.support.ContextLoader;
import com.cantte.cetus.worker.support.DianClients;
import com.cantte.cetus.worker.support.KeyMaterialCache;
import com.cantte.cetus.worker.support.ProcessingContext;
import com.cantte.cetus.worker.support.ResultRecorder;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;

/** Polls GetStatusZip until the DIAN finishes validating a test set document. */
@ApplicationScoped
public class CheckTestSetStatusHandler implements JobHandler {

    @Inject
    ContextLoader loader;

    @Inject
    DianClients dianClients;

    @Inject
    KeyMaterialCache keyCache;

    @Inject
    ResultRecorder recorder;

    @Inject
    ArtifactStore artifacts;

    @Override
    public String type() {
        return JobTypes.CHECK_TEST_SET_STATUS;
    }

    @Override
    public void handle(JobEntity job) {
        ProcessingContext ctx = loader.load(job.referenceId).orElse(null);
        if (ctx == null || ctx.trackId() == null) {
            return;
        }
        KeyMaterial keys = keyCache.get(ctx.certificate());
        List<DianResponse> responses;
        try {
            responses = dianClients.forEnvironment(ctx.environment()).getStatusZip(ctx.trackId(), keys);
        } catch (DianFaultException e) {
            throw ProcessDocumentHandler.escalate(e);
        }
        if (responses.isEmpty() || stillProcessing(responses.getFirst())) {
            throw new RetryLater(Duration.ofSeconds(15), "DIAN is still processing " + ctx.trackId());
        }

        DianResponse response = responses.getFirst();
        recorder.submission(ctx.documentId(), "GetStatusZip", ctx.trackId(), false, response, response.errors(), 0);
        artifacts.save(
                ctx,
                Kind.DIAN_RESPONSE,
                "dian-response.xml",
                response.rawXml().getBytes(StandardCharsets.UTF_8),
                "application/xml");
        if (response.applicationResponse() != null) {
            artifacts.save(
                    ctx,
                    Kind.APPLICATION_RESPONSE,
                    "application-response.xml",
                    Base64.getDecoder().decode(response.applicationResponse()),
                    "application/xml");
        }
        recorder.completed(ctx.documentId(), response);
        if (response.testSetAlreadyAccepted() && ctx.testSetId() != null) {
            recorder.testSetAccepted(ctx.issuerId(), ctx.testSetId());
        }
    }

    @Override
    public void onDead(JobEntity job, String reason) {
        recorder.gaveUp(job.referenceId, "Gave up checking the test set status: " + reason);
    }

    /**
     * Heuristic until the codes are confirmed with real habilitación responses: a response with
     * no status code, or a description saying the batch is in process, means "try again later".
     */
    private static boolean stillProcessing(DianResponse response) {
        if (response.statusCode() == null) {
            return true;
        }
        String description = response.statusDescription() == null
                ? ""
                : response.statusDescription().toLowerCase();
        return description.contains("en proceso") || description.contains("procesamiento");
    }
}
