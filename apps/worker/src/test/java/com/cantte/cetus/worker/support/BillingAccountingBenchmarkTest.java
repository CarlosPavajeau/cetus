package com.cantte.cetus.worker.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.dian.DianResponse;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.usage.UsagePeriod;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.usage.UsageCounters;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

@QuarkusTest
@EnabledIfEnvironmentVariable(named = "CETUS_BILLING_BENCH", matches = "true")
class BillingAccountingBenchmarkTest {
    private static final DianResponse ACCEPTED =
            new DianResponse(true, "00", "Accepted", null, List.of(), null, null, null);

    @Inject
    WorkerFixtures fixtures;

    @Inject
    ResultRecorder recorder;

    @Inject
    UsageCounters usage;

    @Inject
    EntityManager entityManager;

    @RepeatedTest(4)
    void measuresAccountingWithRealPostgresAndLocalVerdicts(org.junit.jupiter.api.RepetitionInfo repetition)
            throws Exception {
        for (int accounts : new int[] {1, 16}) {
            var invoices = new ArrayList<UUID>();
            for (int i = 0; i < accounts; i++) {
                UUID invoice = fixtures.invoice();
                QuarkusTransaction.requiringNew()
                        .run(() -> DocumentEntity.<DocumentEntity>findById(invoice).environment = Environment.LIVE);
                invoices.add(invoice);
            }
            var documents = new ArrayList<UUID>();
            for (int i = 0; i < 32; i++) documents.add(fixtures.creditNote(invoices.get(i % accounts)));
            var start = new CountDownLatch(1);
            var running = new AtomicBoolean(true);
            var lockWaitNanos = new AtomicLong();
            var samples = new AtomicLong();
            long started = System.nanoTime();
            List<Long> durations = new ArrayList<>();
            try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
                var monitor = executor.submit(() -> {
                    long previous = System.nanoTime();
                    while (running.get()) {
                        long blocked = QuarkusTransaction.requiringNew()
                                .call(() -> entityManager
                                        .unwrap(org.hibernate.Session.class)
                                        .createNativeQuery(
                                                "select count(*) from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'",
                                                Long.class)
                                        .getSingleResult());
                        long now = System.nanoTime();
                        lockWaitNanos.addAndGet(blocked * (now - previous));
                        previous = now;
                        samples.incrementAndGet();
                        try {
                            Thread.sleep(2);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            throw new IllegalStateException(e);
                        }
                    }
                });
                var tasks = new ArrayList<Future<Long>>();
                for (UUID id : documents)
                    tasks.add(executor.submit(() -> {
                        if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Start timed out");
                        long before = System.nanoTime();
                        recorder.completed(id, ACCEPTED);
                        return System.nanoTime() - before;
                    }));
                start.countDown();
                try {
                    for (var task : tasks) durations.add(task.get(30, TimeUnit.SECONDS));
                } finally {
                    running.set(false);
                }
                monitor.get(10, TimeUnit.SECONDS);
            }
            long elapsed = System.nanoTime() - started;
            durations.sort(Long::compareTo);
            for (UUID invoice : invoices) {
                long counted = QuarkusTransaction.requiringNew().call(() -> {
                    DocumentEntity doc = DocumentEntity.findById(invoice);
                    return usage.byType(doc.accountId, UsagePeriod.current()).get(DocumentType.CREDIT_NOTE);
                });
                assertThat(counted).isEqualTo(32 / accounts);
            }
            System.out.printf(
                    "BILLING_BENCH repetition=%d accounts=%d concurrency=32 documents=32 total_ms=%.3f p95_transaction_ms=%.3f lock_wait_ms_estimated=%.3f samples=%d%n",
                    repetition.getCurrentRepetition() - 1,
                    accounts,
                    elapsed / 1e6,
                    durations.get(30) / 1e6,
                    lockWaitNanos.get() / 1e6,
                    samples.get());
        }
    }
}
