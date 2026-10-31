package com.cantte.cetus.api.billing;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.admin.PlatformRoles;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.api.support.Credits;
import com.cantte.cetus.persistence.entity.CreditGrantEntity;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import jakarta.inject.Inject;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Every member reads the account's credits; the actor of a movement stays with the Cetus team. */
@QuarkusTest
class CreditResourceTest {

    private static final ConsoleUser ADMIN = ConsoleUser.platformStaff(PlatformRoles.ADMIN);

    @Inject
    Credits credits;

    @Test
    void anAccountWithoutLotsHasNoProduct() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Sin Lotes SAS");

        owner.request()
                .get("/console/credits")
                .then()
                .statusCode(200)
                .body("product", equalTo(false))
                .body("available", equalTo(0))
                .body("graceMargin", equalTo(0))
                .body("lots.size()", equalTo(0));
    }

    @Test
    void aMemberSeesTheBalanceTheLotsAndWhatMovedThem() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Con Saldo SAS");
        UUID accountId = UUID.fromString(
                owner.request().get("/console/account").then().extract().path("id"));
        CreditGrantEntity lot =
                credits.grant(accountId, "NEGOCIO", 1000, OffsetDateTime.now().plusMonths(12));
        credits.grant(accountId, "RECARGA_100", 100, OffsetDateTime.now().plusMonths(12));
        ADMIN.request()
                .body(Map.of("quantity", -50, "reason", "Corrección de prueba"))
                .post("/admin/accounts/" + accountId + "/credits/adjustments")
                .then()
                .statusCode(200);

        JsonPath view = owner.member("member")
                .request()
                .get("/console/credits")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();

        assertThat(view.getBoolean("product")).isTrue();
        assertThat(view.getInt("available")).isEqualTo(1050);
        assertThat(view.getInt("granted")).isEqualTo(1100);
        assertThat(view.getInt("graceMargin")).isEqualTo(10);
        assertThat(view.getInt("issuersIncluded")).isEqualTo(1);
        assertThat(view.getLong("issuersLive")).isZero();
        assertThat(view.getList("lots")).hasSize(2);
        assertThat(view.getMap("lots.find { it.id == '%s' }".formatted(lot.id)))
                .containsEntry("planName", "Negocio")
                .containsEntry("planKind", "PACKAGE")
                .containsEntry("quantity", 1000);
        assertThat(view.getMap("movements.find { it.type == 'ADJUST' }"))
                .containsEntry("actorType", "PLATFORM")
                .containsEntry("reason", "Corrección de prueba")
                .doesNotContainKey("actorId");
    }
}
