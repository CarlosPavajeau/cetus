package com.cantte.cetus.api.credits;

import static com.cantte.cetus.api.support.IssuedDocuments.api;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleFixtures;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.Credits;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.model.DocumentStatus;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.persistence.entity.AccountEntity;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import com.cantte.cetus.persistence.entity.CreditReservationEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.NumberingRangeEntity;
import com.cantte.cetus.persistence.entity.PlanEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.Response;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

/**
 * A production document reserves a credit when it is created: from the lot that expires first, else within the
 * package's grace margin, else a 402 that undoes the document and its number. A credit note always goes through.
 */
@QuarkusTest
class DocumentCreditsTest {

    @Inject
    Credits credits;

    @Test
    void withoutAProductOnlyCreditNotesAreIssued() {
        Live live = live();
        long numberNext = numberNext(live.issuerId());

        invoice(live).then().statusCode(402).body("code", equalTo("no_active_product"));
        assertThat(numberNext(live.issuerId())).isEqualTo(numberNext);

        live.user()
                .request()
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(invoiceBody(live))
                .post("/console/documents/invoices")
                .then()
                .statusCode(402)
                .body("code", equalTo("no_active_product"));

        String invoiceId = acceptedInvoice(live);
        creditNote(live, invoiceId).then().statusCode(202);
        creditNote(live, invoiceId).then().statusCode(202);
    }

    @Test
    void aHundredInvoicesAtOnceTakeTheFiftyCreditsTheGraceAndNoMore() throws Exception {
        Live live = live();
        CreditGrantEntity lot = credits.grant(
                live.accountId(), "EMPRENDEDOR", 50, OffsetDateTime.now().plusMonths(1));

        // A key bursts 20 requests: five keep the race clear of its rate limit.
        List<Live> keys = List.of(live, withKey(live), withKey(live), withKey(live), withKey(live));
        List<Callable<Response>> racers = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            Live racer = keys.get(i % keys.size());
            racers.add(() -> invoice(racer));
        }
        List<Integer> statuses = race(racers).stream().map(Response::statusCode).toList();

        assertThat(statuses).filteredOn(status -> status == 202).hasSize(60);
        assertThat(statuses).filteredOn(status -> status == 402).hasSize(40);
        assertThat(reservations(live.accountId()))
                .extracting(reservation -> reservation.kind)
                .filteredOn(kind -> kind == CreditReservationEntity.Kind.CREDIT)
                .hasSize(50);
        assertThat(reservations(live.accountId()))
                .filteredOn(reservation -> reservation.kind == CreditReservationEntity.Kind.GRACE)
                .hasSize(10);
        CreditGrantEntity spent = QuarkusTransaction.requiringNew().call(() -> CreditGrantEntity.findById(lot.id));
        assertThat(spent.remaining).isZero();
        assertThat(spent.status).isEqualTo(CreditGrantEntity.Status.EXHAUSTED);

        String invoiceId = acceptedInvoiceOf(live.accountId());
        creditNote(live, invoiceId).then().statusCode(202);
        debitNote(live, invoiceId).then().statusCode(402).body("code", equalTo("insufficient_credits"));
    }

    @Test
    void aProductPastItsValidityIsNoProduct() {
        Live live = live();
        credits.grant(live.accountId(), "EMPRENDEDOR", 300, OffsetDateTime.now().minusMinutes(1));

        invoice(live).then().statusCode(402).body("code", equalTo("no_active_product"));
    }

    @Test
    void theLotThatExpiresFirstIsSpentFirst() {
        Live live = live();
        CreditGrantEntity later = credits.grant(
                live.accountId(), "EMPRENDEDOR", 5, OffsetDateTime.now().plusMonths(6));
        CreditGrantEntity sooner = credits.grant(
                live.accountId(), "RECARGA_100", 5, OffsetDateTime.now().plusMonths(1));

        String id = invoice(live).then().statusCode(202).extract().path("id");

        CreditReservationEntity reservation = QuarkusTransaction.requiringNew()
                .call(() -> CreditReservationEntity.listByDocument(UUID.fromString(id))
                        .getFirst());
        assertThat(reservation.grantId).isEqualTo(sooner.id).isNotEqualTo(later.id);
    }

    private record Live(UUID accountId, ConsoleUser user, String issuerId, String apiKey) {}

    /**
     * A production issuer with every range and no product, on a plan of its own without request limits, so a race
     * of requests is not throttled.
     */
    private static Live live() {
        ConsoleUser user = ConsoleUser.newOrganization();
        String accountId = ConsoleFixtures.bootstrap(user, "Créditos SAS");
        String issuerId = ConsoleFixtures.completeSetup(user, ConsoleFixtures.createIssuer(user, "900123456", "LIVE"))
                .issuerId();
        ConsoleFixtures.addCreditNoteRange(user, issuerId);
        ConsoleFixtures.addDebitNoteRange(user, issuerId);
        Credits.expireAll(UUID.fromString(accountId));
        QuarkusTransaction.requiringNew().run(() -> {
            PlanEntity plan = new PlanEntity();
            plan.id = Ids.newId();
            plan.code = "TEST_" + plan.id;
            plan.name = "Prueba";
            plan.persist();
            AccountEntity.<AccountEntity>findById(UUID.fromString(accountId)).planId = plan.id;
        });
        return new Live(UUID.fromString(accountId), user, issuerId, liveKey(user));
    }

    private static Live withKey(Live live) {
        return new Live(live.accountId(), live.user(), live.issuerId(), liveKey(live.user()));
    }

    private static String liveKey(ConsoleUser user) {
        return user.request()
                .body(Map.of("name", "ERP", "environment", "LIVE"))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .path("secret");
    }

    /** An accepted invoice of the account, seeded without a credit as one issued before credits existed. */
    private String acceptedInvoice(Live live) {
        credits.grant(live.accountId(), "EMPRENDEDOR", 1, OffsetDateTime.now().plusMonths(1));
        String id = invoice(live).then().statusCode(202).extract().path("id");
        accept(id);
        QuarkusTransaction.requiringNew()
                .run(() -> CreditGrantEntity.update(
                        "expiresAt = ?1 where accountId = ?2",
                        OffsetDateTime.now().minusSeconds(1),
                        live.accountId()));
        return id;
    }

    private static String acceptedInvoiceOf(UUID accountId) {
        UUID id = QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>find(
                                "accountId = ?1 and documentType = ?2", accountId, DocumentType.INVOICE)
                        .firstResult()
                        .id);
        accept(id.toString());
        return id.toString();
    }

    private static long numberNext(String issuerId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> NumberingRangeEntity.<NumberingRangeEntity>find(
                                "issuerId = ?1 and documentType = ?2", UUID.fromString(issuerId), DocumentType.INVOICE)
                        .singleResult()
                        .nextNumber);
    }

    private static List<CreditReservationEntity> reservations(UUID accountId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> CreditReservationEntity.<CreditReservationEntity>list("accountId", accountId));
    }

    private static Response invoice(Live live) {
        return create(live, "/v1/invoices", invoiceBody(live));
    }

    private static Map<String, Object> invoiceBody(Live live) {
        return Map.of(
                "issuerId", live.issuerId(),
                "customer",
                        Map.of(
                                "personType", "NATURAL_PERSON",
                                "identificationType", "CITIZEN_ID",
                                "identificationNumber", "1020304050",
                                "legalName", "Consumidor Final"),
                "payment", Map.of("method", "CASH", "meansCode", "10"),
                "lines", List.of(line(1000)));
    }

    private static Response creditNote(Live live, String invoiceId) {
        return create(
                live,
                "/v1/credit-notes",
                Map.of(
                        "invoiceId",
                        invoiceId,
                        "concept",
                        "PARTIAL_RETURN",
                        "description",
                        "Devolución parcial",
                        "lines",
                        List.of(line(100))));
    }

    private static Response debitNote(Live live, String invoiceId) {
        return create(
                live,
                "/v1/debit-notes",
                Map.of(
                        "invoiceId",
                        invoiceId,
                        "concept",
                        "INTEREST",
                        "description",
                        "Intereses de mora",
                        "lines",
                        List.of(line(100))));
    }

    private static Response create(Live live, String path, Map<String, Object> body) {
        return api(live.apiKey())
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .body(body)
                .post(path);
    }

    private static Map<String, Object> line(int unitPrice) {
        return Map.of(
                "itemCode",
                "SERV-1",
                "description",
                "Servicio",
                "quantity",
                1,
                "unitPrice",
                unitPrice,
                "taxes",
                List.of(Map.of("type", "IVA", "percent", 19)));
    }

    private static void accept(String documentId) {
        QuarkusTransaction.requiringNew()
                .run(() -> DocumentEntity.<DocumentEntity>findById(UUID.fromString(documentId)).status =
                        DocumentStatus.ACCEPTED);
    }

    /** Runs the requests at once, on threads that see the test's classes as RestAssured needs. */
    private static List<Response> race(List<Callable<Response>> racers) throws Exception {
        ClassLoader classes = Thread.currentThread().getContextClassLoader();
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(racers.size(), task -> {
            Thread thread = new Thread(task);
            thread.setContextClassLoader(classes);
            return thread;
        });
        try {
            List<Future<Response>> futures = new ArrayList<>();
            for (Callable<Response> racer : racers) {
                futures.add(pool.submit(() -> {
                    start.await();
                    return racer.call();
                }));
            }
            start.countDown();
            List<Response> responses = new ArrayList<>();
            for (Future<Response> future : futures) {
                responses.add(future.get(60, TimeUnit.SECONDS));
            }
            return responses;
        } finally {
            pool.shutdownNow();
        }
    }
}
