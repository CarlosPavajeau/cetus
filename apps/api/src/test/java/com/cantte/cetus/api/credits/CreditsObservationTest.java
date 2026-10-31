package com.cantte.cetus.api.credits;

import static com.cantte.cetus.api.support.IssuedDocuments.api;
import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.api.support.ConsoleFixtures;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.Credits;
import com.cantte.cetus.api.support.Subscriptions;
import com.cantte.cetus.credits.CreditLedger;
import com.cantte.cetus.persistence.audit.Actor;
import com.cantte.cetus.persistence.entity.CreditReservationEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * While observing, nothing the credits would refuse is refused: a document is reserved as grace no lot will pay
 * for, and a production issuer is created without a package.
 */
@QuarkusTest
@TestProfile(CreditsObservationTest.Observing.class)
class CreditsObservationTest {

    @Inject
    CreditLedger ledger;

    @Inject
    Subscriptions subscriptions;

    public static class Observing implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("cetus.credits.enforce", "false");
        }
    }

    @Test
    void withoutAProductADocumentIsIssuedAsWaivedGraceAndAnIssuerIsCreated() {
        ConsoleUser user = ConsoleUser.newOrganization();
        String accountId = ConsoleFixtures.bootstrap(user, "Observada SAS");
        String issuerId = ConsoleFixtures.completeSetup(user, ConsoleFixtures.createIssuer(user, "900123456", "LIVE"))
                .issuerId();
        Credits.expireAll(UUID.fromString(accountId));
        String key = user.request()
                .body(Map.of("name", "ERP", "environment", "LIVE"))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .path("secret");

        String id = invoice(key, issuerId);

        CreditReservationEntity reservation = QuarkusTransaction.requiringNew()
                .call(() -> CreditReservationEntity.listByDocument(UUID.fromString(id))
                        .getFirst());
        assertThat(reservation.kind).isEqualTo(CreditReservationEntity.Kind.GRACE);
        assertThat(reservation.accountId).isEqualTo(UUID.fromString(accountId));
        assertThat(reservation.settled).isTrue();

        user.request()
                .body(ConsoleFixtures.issuerRequest("900333444", "LIVE"))
                .post("/console/issuers")
                .then()
                .statusCode(200);
    }

    @Test
    void aWaivedOverageDocumentReleasedAndAcceptedLaterIsNeverBilled() {
        ConsoleUser user = ConsoleUser.newOrganization();
        UUID accountId = UUID.fromString(ConsoleFixtures.bootstrap(user, "Observada Suscrita SAS"));
        String issuerId = ConsoleFixtures.completeSetup(user, ConsoleFixtures.createIssuer(user, "900123456", "LIVE"))
                .issuerId();
        Credits.expireAll(accountId);
        Subscriptions.Started subscription = subscriptions.subscribe(accountId, "INICIAL", null);
        Subscriptions.overageLimit(subscription.subscriptionId(), 0);
        String key = user.request()
                .body(Map.of("name", "ERP", "environment", "LIVE"))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .path("secret");

        UUID id = UUID.fromString(invoice(key, issuerId));
        QuarkusTransaction.requiringNew().run(() -> {
            ledger.release(id, Actor.system(), "Resuelto como no emitido");
            ledger.confirm(id, OffsetDateTime.now());
        });

        CreditReservationEntity reservation = QuarkusTransaction.requiringNew()
                .call(() -> CreditReservationEntity.listByDocument(id).getFirst());
        assertThat(reservation.kind).isEqualTo(CreditReservationEntity.Kind.OVERAGE);
        assertThat(reservation.status).isEqualTo(CreditReservationEntity.Status.CONFIRMED);
        assertThat(reservation.settled).isTrue();
        assertThat(QuarkusTransaction.requiringNew().call(() -> ledger.billOverage(accountId, subscription.periodId())))
                .isZero();
    }

    private static String invoice(String key, String issuerId) {
        return api(key).header("Idempotency-Key", UUID.randomUUID().toString())
                .body(Map.of(
                        "issuerId", issuerId,
                        "customer",
                                Map.of(
                                        "personType", "NATURAL_PERSON",
                                        "identificationType", "CITIZEN_ID",
                                        "identificationNumber", "1020304050",
                                        "legalName", "Consumidor Final"),
                        "payment", Map.of("method", "CASH", "meansCode", "10"),
                        "lines",
                                List.of(Map.of(
                                        "itemCode",
                                        "SERV-1",
                                        "description",
                                        "Servicio",
                                        "quantity",
                                        1,
                                        "unitPrice",
                                        1000,
                                        "taxes",
                                        List.of(Map.of("type", "IVA", "percent", 19))))))
                .post("/v1/invoices")
                .then()
                .statusCode(202)
                .extract()
                .path("id");
    }
}
