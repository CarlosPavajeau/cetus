package com.cantte.cetus.worker.ops;

import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity;
import com.cantte.cetus.worker.handlers.SendNotificationHandler;
import com.cantte.cetus.worker.notifications.Dates;
import com.cantte.cetus.worker.ops.AccountHealthChecks.Notice;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.FakeResend;
import com.cantte.cetus.worker.support.FakeResendResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The daily check against seeded data. Other tests share the database, so every assertion looks only at
 * the notices of the accounts seeded here.
 */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
@QuarkusTestResource(FakeResendResource.class)
class AccountHealthTest {

    @Inject
    AccountHealth health;
    @Inject
    SendNotificationHandler sender;
    @Inject
    WorkerFixtures fixtures;
    @Inject
    FakeResend resend;
    @Inject
    EntityManager em;

    private final LocalDate today = LocalDate.now(Dates.BOGOTA);

    @BeforeEach
    void reset() {
        resend.reset();
    }

    @Test
    void aCertificateSevenDaysFromExpiringSendsOneEmailToTheFiscalContact() {
        Seeded seeded = seed();
        sql("UPDATE billing.signing_certificates SET valid_to = now() + interval '6 days 12 hours' WHERE issuer_id = ?1",
                seeded.issuerId());

        List<Notice> notices = forAccount(health.run(today), seeded.accountId());
        assertThat(notices).singleElement().satisfies(notice ->
                assertThat(notice.dedupKey()).endsWith(":7d").startsWith("cert_expiring:"));
        send(seeded.accountId());

        assertThat(resend.requests()).singleElement().satisfies(request -> {
            assertThat(request.body().get("to").get(0).asText()).isEqualTo("fiscal@cetus.test");
            assertThat(request.body().get("subject").asText()).contains("certificado").contains("vence en");
            assertThat(request.body().get("text").asText()).contains("/issuers/" + seeded.issuerId());
        });

        // The next day it is still within 7 days: nothing new.
        assertThat(forAccount(health.run(today.plusDays(1)), seeded.accountId())).isEmpty();
        // At 1 day, a new notice.
        sql("UPDATE billing.signing_certificates SET valid_to = now() + interval '12 hours' WHERE issuer_id = ?1",
                seeded.issuerId());
        assertThat(forAccount(health.run(today), seeded.accountId())).extracting(Notice::dedupKey)
                .singleElement().asString().endsWith(":1d");
    }

    @Test
    void liveRangesAreNotifiedAt80And95PercentAndBeforeTheirResolutionEnds() {
        Seeded seeded = seed();
        sql("UPDATE billing.issuers SET environment = 'LIVE' WHERE id = ?1", seeded.issuerId());
        // A range can be saved without its resolution number.
        sql("UPDATE billing.numbering_ranges SET range_from = 1, range_to = 100, next_number = 86, valid_to = ?2, "
                + "resolution_number = NULL WHERE issuer_id = ?1", seeded.issuerId(), today.plusDays(20));

        assertThat(forAccount(health.run(today), seeded.accountId())).extracting(Notice::dedupKey)
                .containsExactlyInAnyOrder("range_usage:%s:80".formatted(seeded.rangeId()),
                        "resolution_expiring:%s:30d".formatted(seeded.rangeId()));
        send(seeded.accountId());
        assertThat(resend.requests()).extracting(request -> request.body().get("text").asText())
                .anySatisfy(text -> assertThat(text).contains("La resolución del rango SETP"));

        sql("UPDATE billing.numbering_ranges SET next_number = 97 WHERE issuer_id = ?1", seeded.issuerId());
        assertThat(forAccount(health.run(today), seeded.accountId())).extracting(Notice::dedupKey)
                .containsExactly("range_usage:%s:95".formatted(seeded.rangeId()));
    }

    @Test
    void aRiseInRejectionsGoesOnceToEachAddressOfTheFiscalAndTechnicalContacts() {
        UUID documentId = fixtures.invoice();
        UUID accountId = account(documentId);
        fixtures.contacts(accountId, "ops@cetus.test", "ops@cetus.test", "billing@cetus.test");
        // 5 rejected out of 8 verdicts yesterday, for documents created the day before: a verdict counts on
        // its own day, even when the document waited past a run.
        sql("""
                INSERT INTO billing.documents (id, account_id, issuer_id, environment, document_type, operation_type,
                    numbering_range_id, prefix, number, issue_date, issue_time, customer, payment, line_extension_amount,
                    tax_exclusive_amount, tax_inclusive_amount, payable_amount, status, request_payload, created_at,
                    validated_at)
                SELECT gen_random_uuid(), account_id, issuer_id, 'LIVE', document_type, operation_type,
                    numbering_range_id, prefix, number + g, issue_date, issue_time, customer, payment,
                    line_extension_amount, tax_exclusive_amount, tax_inclusive_amount, payable_amount,
                    CASE WHEN g <= 5 THEN 'REJECTED' ELSE 'ACCEPTED' END, request_payload, ?2, ?3
                FROM billing.documents, generate_series(1, 8) g WHERE id = ?1
                """, documentId, today.minusDays(2).atTime(12, 0).atZone(Dates.BOGOTA).toOffsetDateTime(),
                today.minusDays(1).atTime(9, 0).atZone(Dates.BOGOTA).toOffsetDateTime());

        assertThat(forAccount(health.run(today), accountId)).singleElement().satisfies(notice -> {
            assertThat(notice.dedupKey()).isEqualTo("rejections_spike:%s:%s".formatted(accountId, today.minusDays(1)));
            assertThat(notice.data()).containsEntry("rejected", "5").containsEntry("total", "8")
                    .containsEntry("rate", "63");
        });
        send(accountId);

        assertThat(resend.requests()).singleElement().satisfies(request ->
                assertThat(request.body().get("to").get(0).asText()).isEqualTo("ops@cetus.test"));
    }

    private record Seeded(UUID accountId, UUID issuerId, UUID rangeId) {
    }

    private Seeded seed() {
        UUID documentId = fixtures.invoice();
        DocumentEntity document = QuarkusTransaction.requiringNew().call(() -> DocumentEntity.findById(documentId));
        fixtures.contacts(document.accountId, "tech@cetus.test", "fiscal@cetus.test", "billing@cetus.test");
        return new Seeded(document.accountId, document.issuerId, document.numberingRangeId);
    }

    private UUID account(UUID documentId) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentEntity.<DocumentEntity>findById(documentId).accountId);
    }

    /** Runs the SEND_NOTIFICATION jobs of the account's pending notices. */
    private void send(UUID accountId) {
        List<NotificationEntity> pending = QuarkusTransaction.requiringNew().call(() ->
                NotificationEntity.list("accountId = ?1 and status = ?2", accountId, NotificationEntity.Status.PENDING));
        for (NotificationEntity notice : pending) {
            sender.handle(fixtures.notificationJob(notice.id));
        }
    }

    private static List<Notice> forAccount(List<Notice> notices, UUID accountId) {
        return notices.stream().filter(notice -> notice.accountId().equals(accountId)).toList();
    }

    private void sql(String sql, Object... parameters) {
        QuarkusTransaction.requiringNew().run(() -> {
            var query = em.createNativeQuery(sql);
            for (int i = 0; i < parameters.length; i++) {
                query.setParameter(i + 1, parameters[i]);
            }
            query.executeUpdate();
        });
    }
}
