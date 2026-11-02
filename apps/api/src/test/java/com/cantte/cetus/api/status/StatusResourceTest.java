package com.cantte.cetus.api.status;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.admin.PlatformRoles;
import com.cantte.cetus.api.status.StatusViews.ComponentStatus;
import com.cantte.cetus.api.status.StatusViews.IncidentRequest;
import com.cantte.cetus.api.status.StatusViews.PlatformStatusView;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.IssuedDocuments;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DianSubmissionEntity;
import com.cantte.cetus.persistence.entity.DianSubmissionEntity.ErrorKind;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.StatusIncidentEntity.IncidentImpact;
import com.cantte.cetus.persistence.entity.StatusIncidentEntity.StatusComponent;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** The public status: the DIAN fails when its sends go unanswered, processing lags, incidents raise a component. */
@QuarkusTest
class StatusResourceTest {

    private static final ConsoleUser ADMIN = ConsoleUser.platformStaff(PlatformRoles.ADMIN);
    private static final ConsoleUser SUPPORT = ConsoleUser.platformStaff(PlatformRoles.SUPPORT);

    @Inject
    PlatformStatus platformStatus;

    @Test
    void theDianFailsWhenEnoughOfItsSendsGoUnanswered() {
        outOfTheWindow();
        IssuedDocuments.Issuer issuer = IssuedDocuments.issuer("Estado DIAN SAS");
        sends(document(issuer, Environment.LIVE), 3, null);
        sends(document(issuer, Environment.LIVE), 2, ErrorKind.TRANSPORT);
        sends(document(issuer, Environment.TEST), 4, ErrorKind.TIMEOUT);
        sends(document(issuer, Environment.SANDBOX), 5, ErrorKind.FAULT);
        platformStatus.invalidate();

        PlatformStatusView status = status();

        assertThat(component(status, StatusComponent.DIAN_LIVE)).isEqualTo(ComponentStatus.DEGRADED);
        assertThat(component(status, StatusComponent.DIAN_TEST)).isEqualTo(ComponentStatus.OPERATIONAL);
        assertThat(component(status, StatusComponent.API)).isEqualTo(ComponentStatus.OPERATIONAL);
        assertThat(status.status()).isEqualTo(ComponentStatus.DEGRADED);
    }

    @Test
    void processingLagsWhileAReadyJobWaits() {
        UUID jobId = Ids.newId();
        QuarkusTransaction.requiringNew().run(() -> {
            JobEntity job = new JobEntity();
            job.id = jobId;
            job.jobType = JobTypes.PROCESS_DOCUMENT;
            job.referenceId = Ids.newId();
            job.runAt = OffsetDateTime.now().minusMinutes(10);
            job.updatedAt = job.runAt;
            job.persist();
        });
        try {
            platformStatus.invalidate();

            assertThat(component(status(), StatusComponent.PROCESSING)).isEqualTo(ComponentStatus.DEGRADED);
        } finally {
            QuarkusTransaction.requiringNew().run(() -> JobEntity.deleteById(jobId));
            platformStatus.invalidate();
        }
    }

    @Test
    void anIncidentRaisesItsComponentUntilItIsResolved() {
        IncidentRequest outage =
                new IncidentRequest(StatusComponent.API, IncidentImpact.OUTAGE, "API caída", "Estamos revisando.");

        SUPPORT.request().body(outage).post("/admin/incidents").then().statusCode(403);
        String id = ADMIN.request()
                .body(outage)
                .post("/admin/incidents")
                .then()
                .statusCode(200)
                .extract()
                .path("id");

        assertThat(component(status(), StatusComponent.API)).isEqualTo(ComponentStatus.OUTAGE);

        IncidentRequest degraded = new IncidentRequest(
                StatusComponent.API, IncidentImpact.DEGRADED, "API lenta", "Las respuestas tardan más de lo normal.");
        ADMIN.request()
                .body(degraded)
                .put("/admin/incidents/" + id)
                .then()
                .statusCode(200)
                .body("title", equalTo("API lenta"));
        assertThat(component(status(), StatusComponent.API)).isEqualTo(ComponentStatus.DEGRADED);

        ADMIN.request().post("/admin/incidents/" + id + "/resolve").then().statusCode(200);
        PlatformStatusView resolved = status();

        assertThat(component(resolved, StatusComponent.API)).isEqualTo(ComponentStatus.OPERATIONAL);
        assertThat(resolved.incidents())
                .filteredOn(incident -> incident.id().toString().equals(id))
                .singleElement()
                .satisfies(incident -> assertThat(incident.resolvedAt()).isNotNull());
        ADMIN.request()
                .post("/admin/incidents/" + id + "/resolve")
                .then()
                .statusCode(422)
                .body("code", equalTo("incident_resolved"));
        SUPPORT.request().get("/admin/incidents").then().statusCode(200);
    }

    @Test
    void anIncidentNeedsATitleAndAMessage() {
        IncidentRequest blank = new IncidentRequest(StatusComponent.DIAN_LIVE, IncidentImpact.DEGRADED, " ", "");

        ADMIN.request().body(blank).post("/admin/incidents").then().statusCode(400);
    }

    private static PlatformStatusView status() {
        return given().get("/status").then().statusCode(200).extract().as(PlatformStatusView.class);
    }

    private static ComponentStatus component(PlatformStatusView status, StatusComponent component) {
        return status.components().stream()
                .filter(view -> view.component() == component)
                .findFirst()
                .orElseThrow()
                .status();
    }

    /** The tests share a database: sends recorded by other tests would count in the window. */
    private static void outOfTheWindow() {
        QuarkusTransaction.requiringNew()
                .run(() -> DianSubmissionEntity.getEntityManager()
                        .createNativeQuery(
                                "UPDATE billing.dian_submissions SET created_at = created_at - interval '1 hour'"
                                        + " WHERE created_at >= now() - interval '1 hour'")
                        .executeUpdate());
    }

    private static UUID document(IssuedDocuments.Issuer issuer, Environment environment) {
        UUID id = IssuedDocuments.invoice(issuer);
        QuarkusTransaction.requiringNew()
                .run(() -> DocumentEntity.<DocumentEntity>findById(id).environment = environment);
        return id;
    }

    private static void sends(UUID documentId, int count, ErrorKind errorKind) {
        QuarkusTransaction.requiringNew().run(() -> {
            for (int i = 0; i < count; i++) {
                DianSubmissionEntity submission = new DianSubmissionEntity();
                submission.id = Ids.newId();
                submission.documentId = documentId;
                submission.operation = "SendBillSync";
                submission.errorKind = errorKind;
                submission.timedOut = errorKind == ErrorKind.TIMEOUT;
                submission.valid = errorKind == null ? Boolean.TRUE : null;
                submission.persist();
            }
        });
    }
}
