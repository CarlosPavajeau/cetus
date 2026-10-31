package com.cantte.cetus.worker.billing;

import com.cantte.cetus.persistence.entity.SubscriptionEntity;
import com.cantte.cetus.persistence.entity.SubscriptionPeriodEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.jboss.logging.Logger;

/**
 * Every so often: closes the subscription periods that ended and opens their renewals, reminds of the renewals
 * still unpaid and cancels the subscriptions whose grace ran out, one period or subscription per transaction. Each
 * step checks under a lock that it was not done, so replicas running it at once only repeat reads.
 */
@ApplicationScoped
public class SubscriptionUpkeep {

    private static final Logger LOG = Logger.getLogger(SubscriptionUpkeep.class);

    @Inject
    Subscriptions subscriptions;

    @Scheduled(
            every = "${cetus.billing.subscription-interval}",
            delayed = "1m",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void scheduled() {
        run(OffsetDateTime.now());
    }

    /** @return periods closed */
    public int run(OffsetDateTime now) {
        List<UUID> ended = QuarkusTransaction.requiringNew().call(() -> SubscriptionPeriodEntity.listEnded(now));
        int closed = 0;
        for (UUID period : ended) {
            try {
                if (QuarkusTransaction.requiringNew().call(() -> subscriptions.close(period, now))) {
                    closed++;
                }
            } catch (RuntimeException e) {
                // One period that cannot close must not hold back the renewals of every other account.
                LOG.errorf(e, "Subscription period %s could not close; it is tried again on the next run", period);
            }
        }
        List<UUID> pastDue = QuarkusTransaction.requiringNew().call(SubscriptionEntity::listPastDue);
        int canceled = 0;
        for (UUID subscription : pastDue) {
            try {
                if (QuarkusTransaction.requiringNew().call(() -> subscriptions.lapse(subscription, now))) {
                    canceled++;
                } else {
                    QuarkusTransaction.requiringNew().call(() -> subscriptions.remind(subscription, now));
                }
            } catch (RuntimeException e) {
                LOG.errorf(
                        e,
                        "Past due subscription %s could not be tended; it is tried again on the next run",
                        subscription);
            }
        }
        if (closed > 0 || canceled > 0) {
            LOG.infof("%d subscription periods closed, %d subscriptions canceled unpaid", closed, canceled);
        }
        return closed;
    }
}
