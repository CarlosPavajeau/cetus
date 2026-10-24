package com.cantte.cetus.worker.ops;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.email.EmailException;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.worker.ops.OpsAlerts.Run;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.FakeResend;
import com.cantte.cetus.worker.support.FakeResend.Reply;
import com.cantte.cetus.worker.support.FakeResendResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Operational alerts against seeded data. Other tests share the database, so every assertion looks only
 * at the alerts of the rows seeded here.
 */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
@QuarkusTestResource(FakeResendResource.class)
class OpsAlertsTest {

    @Inject
    OpsAlerts alerts;

    @Inject
    WorkerFixtures fixtures;

    @Inject
    FakeResend resend;

    @Inject
    EntityManager em;

    @BeforeEach
    void reset() {
        resend.reset();
    }

    @Test
    void aDeadJobIsEmailedOnceAndAgainOnlyIfItDiesAfterClearing() {
        UUID documentId = fixtures.invoice();
        JobEntity job = fixtures.job(documentId, 10);
        String key = "job_dead:" + job.id;
        sql(
                "UPDATE billing.jobs SET status = 'DEAD', last_error = 'DianTransportException: timeout' WHERE id = ?1",
                job.id);

        assertThat(keys(alerts.run(Run.FREQUENT))).contains(key);
        assertThat(resend.requests()).isNotEmpty();
        var email = resend.requests().get(resend.requests().size() - 1).body();
        assertThat(email.get("to").get(0).asText()).isEqualTo("ops@cetus.test");
        assertThat(email.get("text").asText()).contains(job.id.toString()).contains("DianTransportException: timeout");

        assertThat(keys(alerts.run(Run.FREQUENT))).doesNotContain(key);

        sql("UPDATE billing.jobs SET status = 'PENDING' WHERE id = ?1", job.id);
        alerts.run(Run.FREQUENT);
        assertThat(known(key)).isFalse();
        sql("UPDATE billing.jobs SET status = 'DEAD' WHERE id = ?1", job.id);
        assertThat(keys(alerts.run(Run.FREQUENT))).contains(key);
    }

    @Test
    void aStuckDocumentIsRepeatedOnceADayWhileItPersists() {
        UUID documentId = fixtures.invoice();
        JobEntity job = fixtures.job(documentId, 1);
        String key = "document_stuck:" + documentId;
        sql(
                "UPDATE billing.documents SET status = 'PROCESSING', updated_at = now() - interval '20 minutes' WHERE id = ?1",
                documentId);

        assertThat(keys(alerts.run(Run.FREQUENT))).contains(key);
        assertThat(keys(alerts.run(Run.FREQUENT))).doesNotContain(key);

        sql("UPDATE billing.ops_alerts SET last_sent_at = now() - interval '25 hours' WHERE alert_key = ?1", key);
        assertThat(keys(alerts.run(Run.FREQUENT))).contains(key);

        sql("UPDATE billing.jobs SET status = 'DONE' WHERE id = ?1", job.id);
        alerts.run(Run.FREQUENT);
        assertThat(known(key)).isFalse();
    }

    @Test
    void aRecentDocumentIsNotStuck() {
        UUID documentId = fixtures.invoice();
        fixtures.job(documentId, 1);

        assertThat(keys(alerts.run(Run.FREQUENT))).doesNotContain("document_stuck:" + documentId);
    }

    @Test
    void theDailyRunReportsExpiringCertificatesAndRangesRunningOut() {
        UUID documentId = fixtures.invoice();
        DocumentEntity doc = QuarkusTransaction.requiringNew().call(() -> DocumentEntity.findById(documentId));
        UUID certificateId =
                (UUID) single("SELECT id FROM billing.signing_certificates WHERE issuer_id = ?1", doc.issuerId);
        sql(
                "UPDATE billing.signing_certificates SET valid_to = now() + interval '10 days' WHERE id = ?1",
                certificateId);
        sql("UPDATE billing.numbering_ranges SET next_number = range_to - 10 WHERE id = ?1", doc.numberingRangeId);

        List<OpsAlert> sent = alerts.run(Run.DAILY);

        assertThat(keys(sent))
                .contains("certificate_expiring:" + certificateId, "range_running_out:" + doc.numberingRangeId);
        assertThat(sent)
                .filteredOn(a -> a.key().equals("range_running_out:" + doc.numberingRangeId))
                .singleElement()
                .extracting(OpsAlert::summary)
                .asString()
                .contains("le quedan 11 de 5000001 números");
        // The frequent run neither reports nor forgets the daily categories.
        alerts.run(Run.FREQUENT);
        assertThat(known("certificate_expiring:" + certificateId)).isTrue();
    }

    @Test
    void onlyProductionRangesThatDifferFromTheDianAreReported() {
        UUID documentId = fixtures.invoice();
        DocumentEntity doc = QuarkusTransaction.requiringNew().call(() -> DocumentEntity.findById(documentId));
        String key = "range_unverified:" + doc.numberingRangeId;
        sql(
                "UPDATE billing.numbering_ranges SET verification_status = 'ERROR', verification_error = '301' WHERE id = ?1",
                doc.numberingRangeId);

        // Habilitación: the shared test range always answers 301, so it is not an operator's problem.
        assertThat(keys(alerts.run(Run.FREQUENT))).doesNotContain(key);

        sql("UPDATE billing.issuers SET environment = 'LIVE' WHERE id = ?1", doc.issuerId);
        assertThat(keys(alerts.run(Run.FREQUENT))).contains(key);
    }

    @Test
    void anAlertThatCouldNotBeEmailedIsSentOnTheNextRun() {
        UUID documentId = fixtures.invoice();
        JobEntity job = fixtures.job(documentId, 10);
        String key = "job_dead:" + job.id;
        sql("UPDATE billing.jobs SET status = 'DEAD' WHERE id = ?1", job.id);
        resend.reply(Reply.error(500, "internal_server_error", "Resend is down"));

        assertThatThrownBy(() -> alerts.run(Run.FREQUENT)).isInstanceOf(EmailException.class);
        assertThat(known(key)).isFalse();

        assertThat(keys(alerts.run(Run.FREQUENT))).contains(key);
    }

    private static List<String> keys(List<OpsAlert> sent) {
        return sent.stream().map(OpsAlert::key).toList();
    }

    private boolean known(String key) {
        return ((Number) single("SELECT count(*) FROM billing.ops_alerts WHERE alert_key = ?1", key)).intValue() > 0;
    }

    private Object single(String query, Object parameter) {
        return QuarkusTransaction.requiringNew()
                .call(() ->
                        em.createNativeQuery(query).setParameter(1, parameter).getSingleResult());
    }

    private void sql(String statement, Object parameter) {
        QuarkusTransaction.requiringNew()
                .run(() -> em.createNativeQuery(statement)
                        .setParameter(1, parameter)
                        .executeUpdate());
    }
}
