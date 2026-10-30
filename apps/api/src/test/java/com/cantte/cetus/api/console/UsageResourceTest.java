package com.cantte.cetus.api.console;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.usage.UsagePeriod;
import com.cantte.cetus.persistence.entity.AccountEntity;
import io.quarkus.hibernate.orm.panache.Panache;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import java.time.YearMonth;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class UsageResourceTest {

    @Test
    void aNewAccountStartsOnTheFreePlanWithNothingBilled() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        bootstrap(customer, "Nueva SAS");
        YearMonth now = UsagePeriod.current();

        customer.request()
                .get("/console/usage")
                .then()
                .statusCode(200)
                .body("current.period", equalTo(now.toString()))
                .body("current.plan.code", equalTo("FREE"))
                .body("current.plan.documentsIncluded", equalTo(25))
                .body("current.plan.documentsGrace", equalTo(5))
                .body("current.total", equalTo(0))
                .body("current.documents.documentType", contains("INVOICE", "CREDIT_NOTE", "DEBIT_NOTE"))
                .body("issuersLive", equalTo(0))
                .body("requests.requestsPerSecond", equalTo(1f))
                .body("requests.requestsBurst", equalTo(10))
                .body("requests.perKey", equalTo(false))
                .body("months.period", contains(months(now)));
    }

    @Test
    void showsThisMonthAgainstThePlanAndTheMonthsBefore() {
        ConsoleUser customer = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(bootstrap(customer, "Facturadora SAS"));
        QuarkusTransaction.requiringNew().run(() -> AccountEntity.<AccountEntity>findById(accountId).plan = "INICIAL");
        YearMonth now = UsagePeriod.current();
        bill(accountId, now, DocumentType.INVOICE, 205);
        bill(accountId, now, DocumentType.DEBIT_NOTE, 1);
        bill(accountId, now.minusMonths(2), DocumentType.INVOICE, 40);
        bill(accountId, now.minusMonths(6), DocumentType.INVOICE, 99);

        customer.request()
                .get("/console/usage")
                .then()
                .statusCode(200)
                .body("current.plan.name", equalTo("Inicial"))
                .body("requests.requestsPerSecond", equalTo(5f))
                .body("requests.requestsBurst", equalTo(20))
                .body("requests.perKey", equalTo(false))
                .body("current.total", equalTo(206))
                .body("current.overage", equalTo(6))
                .body("current.costOverageCop", equalTo(900))
                .body("months.total", contains(206, 0, 40, 0, 0, 0));
    }

    private static String[] months(YearMonth last) {
        String[] months = new String[UsageResource.MONTHS];
        for (int i = 0; i < months.length; i++) {
            months[i] = last.minusMonths(i).toString();
        }
        return months;
    }

    private static void bill(UUID accountId, YearMonth period, DocumentType type, int count) {
        QuarkusTransaction.requiringNew()
                .run(() -> Panache.getEntityManager()
                        .createNativeQuery("""
                                INSERT INTO billing.usage_counters (account_id, period, document_type, count)
                                VALUES (:account, :period, :type, :count)
                                """)
                        .setParameter("account", accountId)
                        .setParameter("period", period.toString())
                        .setParameter("type", type.name())
                        .setParameter("count", count)
                        .executeUpdate());
    }
}
