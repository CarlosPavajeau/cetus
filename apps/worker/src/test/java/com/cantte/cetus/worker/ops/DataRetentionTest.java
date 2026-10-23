package com.cantte.cetus.worker.ops;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
class DataRetentionTest {

    @Inject
    DataRetention retention;
    @Inject
    EntityManager em;
    @Inject
    WorkerFixtures fixtures;

    @Test
    void deletesOnlyWhatIsPastItsRetention() {
        OffsetDateTime now = OffsetDateTime.now();
        UUID account = account();
        UUID apiKey = apiKey(account);
        List<UUID> oldRequests = List.of(request(account, apiKey, now.minusDays(31)),
                request(account, apiKey, now.minusDays(40)), request(account, apiKey, now.minusDays(90)));
        UUID recentRequest = request(account, apiKey, now.minusDays(29));
        idempotencyKey(account, "expired", now.minusMinutes(1));
        idempotencyKey(account, "valid", now.plusHours(1));
        UUID oldDone = job("DONE", now.minusDays(8));
        UUID recentDone = job("DONE", now.minusDays(6));
        UUID oldDead = job("DEAD", now.minusDays(400));
        UUID oldPending = job("PENDING", now.minusDays(30));

        retention.run();

        assertThat(existing("api_key_requests", oldRequests)).isEmpty();
        assertThat(existing("api_key_requests", List.of(recentRequest))).containsExactly(recentRequest);
        assertThat(idempotencyKeys(account)).containsExactly("valid");
        assertThat(existing("jobs", List.of(oldDone, recentDone, oldDead, oldPending)))
                .containsExactlyInAnyOrder(recentDone, oldDead, oldPending);
    }

    @Test
    void noticesGoAfterAYearUnlessTheirKeyStillHoldsBackARepeat() {
        OffsetDateTime now = OffsetDateTime.now();
        UUID documentId = fixtures.invoice();
        DocumentEntity document = QuarkusTransaction.requiringNew().call(() -> DocumentEntity.findById(documentId));
        UUID account = document.accountId;
        UUID range = document.numberingRangeId;
        UUID oldCertificate = notice(account, "CERTIFICATE_EXPIRING", "cert_expiring:" + Ids.newId() + ":7d",
                now.minusDays(400));
        UUID recent = notice(account, "ACCOUNT_SUSPENDED", "account_suspended:" + account + ":1", now.minusDays(300));
        UUID activeRange = notice(account, "RANGE_RUNNING_OUT", "range_usage:" + range + ":80", now.minusDays(400));
        UUID goneRange = notice(account, "RANGE_RUNNING_OUT", "range_usage:" + Ids.newId() + ":95", now.minusDays(400));

        retention.run();

        assertThat(existing("notification_log", List.of(oldCertificate, recent, activeRange, goneRange)))
                .containsExactlyInAnyOrder(recent, activeRange);

        // Once the range is used up, its notice can go: it will not cross 80 % again.
        QuarkusTransaction.requiringNew().run(() -> em.createNativeQuery(
                "UPDATE billing.numbering_ranges SET status = 'EXHAUSTED' WHERE id = :id")
                .setParameter("id", range).executeUpdate());
        retention.run();
        assertThat(existing("notification_log", List.of(activeRange))).isEmpty();
    }

    @Test
    void aShortRetentionStillKeepsTheNoticesThatHoldBackAnExpiryReminder() {
        OffsetDateTime now = OffsetDateTime.now();
        UUID account = account();
        // Still requested every day until its certificate reaches 7 days.
        UUID thirtyDays = notice(account, "CERTIFICATE_EXPIRING", "cert_expiring:" + Ids.newId() + ":30d",
                now.minusDays(20));
        UUID older = notice(account, "CERTIFICATE_EXPIRING", "cert_expiring:" + Ids.newId() + ":30d",
                now.minusDays(40));
        retention.run(Duration.ofDays(7));

        assertThat(existing("notification_log", List.of(thirtyDays, older))).containsExactly(thirtyDays);
    }

    private UUID notice(UUID account, String kind, String key, OffsetDateTime at) {
        UUID id = Ids.newId();
        QuarkusTransaction.requiringNew().run(() -> em.createNativeQuery("""
                        INSERT INTO billing.notification_log (id, account_id, kind, dedup_key, status, created_at)
                        VALUES (:id, :account, :kind, :key, 'SENT', :at)
                        """)
                .setParameter("id", id).setParameter("account", account).setParameter("kind", kind)
                .setParameter("key", key).setParameter("at", at)
                .executeUpdate());
        return id;
    }

    private UUID account() {
        return QuarkusTransaction.requiringNew().call(() -> {
            AccountEntity account = new AccountEntity();
            account.id = Ids.newId();
            account.organizationId = "org_" + account.id;
            account.name = "Retención SAS";
            account.persist();
            return account.id;
        });
    }

    private UUID apiKey(UUID account) {
        UUID id = Ids.newId();
        execute("""
                INSERT INTO billing.api_keys (id, account_id, environment, name, key_prefix, key_hash)
                VALUES (:id, :account, 'TEST', 'ERP', 'cetus_test_', :hash)
                """, id, account, "hash-" + id);
        return id;
    }

    private UUID request(UUID account, UUID apiKey, OffsetDateTime at) {
        UUID id = Ids.newId();
        QuarkusTransaction.requiringNew().run(() -> em.createNativeQuery("""
                        INSERT INTO billing.api_key_requests (id, account_id, api_key_id, method, path, status,
                                                              duration_ms, created_at)
                        VALUES (:id, :account, :key, 'POST', '/v1/invoices', 202, 12, :at)
                        """)
                .setParameter("id", id).setParameter("account", account).setParameter("key", apiKey)
                .setParameter("at", at)
                .executeUpdate());
        return id;
    }

    private void idempotencyKey(UUID account, String key, OffsetDateTime expiresAt) {
        QuarkusTransaction.requiringNew().run(() -> em.createNativeQuery("""
                        INSERT INTO billing.idempotency_keys (account_id, environment, idem_key, request_hash, status, expires_at)
                        VALUES (:account, 'TEST', :key, 'hash', 'COMPLETED', :expires)
                        """)
                .setParameter("account", account).setParameter("key", key).setParameter("expires", expiresAt)
                .executeUpdate());
    }

    private UUID job(String status, OffsetDateTime updatedAt) {
        UUID id = Ids.newId();
        QuarkusTransaction.requiringNew().run(() -> em.createNativeQuery("""
                        INSERT INTO billing.jobs (id, job_type, status, run_at, created_at, updated_at)
                        VALUES (:id, 'DELIVER_WEBHOOK', :status, :at, :at, :at)
                        """)
                .setParameter("id", id).setParameter("status", status).setParameter("at", updatedAt)
                .executeUpdate());
        return id;
    }

    private void execute(String sql, UUID id, UUID account, String hash) {
        QuarkusTransaction.requiringNew().run(() -> em.createNativeQuery(sql)
                .setParameter("id", id).setParameter("account", account).setParameter("hash", hash)
                .executeUpdate());
    }

    @SuppressWarnings("unchecked")
    private List<UUID> existing(String table, List<UUID> ids) {
        return QuarkusTransaction.requiringNew().call(() -> em.createNativeQuery(
                        "SELECT id FROM billing." + table + " WHERE id IN (:ids)", UUID.class)
                .setParameter("ids", ids)
                .getResultList());
    }

    @SuppressWarnings("unchecked")
    private List<String> idempotencyKeys(UUID account) {
        return QuarkusTransaction.requiringNew().call(() -> em.createNativeQuery(
                        "SELECT idem_key FROM billing.idempotency_keys WHERE account_id = :account", String.class)
                .setParameter("account", account)
                .getResultList());
    }
}
