package com.cantte.cetus.api.console;

import com.cantte.cetus.api.admin.PlatformRoles;
import com.cantte.cetus.api.auth.ApiKeys;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.persistence.entity.AccountContactEntity;
import com.cantte.cetus.persistence.entity.AccountContactEntity.Category;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class ContactVerificationResourceTest {

    private static final SecureRandom RANDOM = new SecureRandom();

    @Test
    void theLinkVerifiesTheNewAddressOnce() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        String accountId = bootstrap(owner, "Verificada SAS");
        owner.request().body(Map.of("email", "fiscal@example.com")).put("/console/contacts/FISCAL").then().statusCode(200);
        String token = link(accountId, Category.FISCAL, OffsetDateTime.now().plusHours(48));

        // Opening the page does not spend the link, so a mail scanner cannot verify on its own.
        given().get("/console/contact-verifications/" + token).then().statusCode(200)
                .body("accountName", equalTo("Verificada SAS"))
                .body("category", equalTo("FISCAL"))
                .body("email", equalTo("fiscal@example.com"));
        given().get("/console/contact-verifications/" + token).then().statusCode(200);

        given().post("/console/contact-verifications/" + token).then().statusCode(200)
                .body("email", equalTo("fiscal@example.com"));
        given().post("/console/contact-verifications/" + token).then().statusCode(404);
        given().get("/console/contact-verifications/" + token).then().statusCode(404);

        owner.request().get("/console/contacts").then().statusCode(200)
                .body("find { it.category == 'FISCAL' }.email", equalTo("fiscal@example.com"))
                .body("find { it.category == 'FISCAL' }.pendingEmail", nullValue())
                .body("find { it.category == 'TECHNICAL' }.email", equalTo(owner.email()));
        owner.request().get("/console/audit-log?action=CONTACT_VERIFIED").then().statusCode(200)
                .body("items[0].actorType", equalTo("SYSTEM"));
    }

    @Test
    void aSuspendedAccountKeepsItsContacts() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        String accountId = bootstrap(owner, "Suspendida SAS");
        owner.request().body(Map.of("email", "fiscal@example.com")).put("/console/contacts/FISCAL").then().statusCode(200);
        String token = link(accountId, Category.FISCAL, OffsetDateTime.now().plusHours(48));
        ConsoleUser.platformStaff(PlatformRoles.ADMIN).request().body(Map.of("reason", "Pago vencido"))
                .post("/admin/accounts/" + accountId + "/suspension").then().statusCode(200);

        given().post("/console/contact-verifications/" + token).then().statusCode(422)
                .body("code", equalTo("account_suspended"));
        owner.request().get("/console/contacts").then().statusCode(200)
                .body("find { it.category == 'FISCAL' }.email", equalTo(owner.email()));
    }

    @Test
    void expiredUnknownAndMalformedLinksAreRefused() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        String accountId = bootstrap(owner, "Vencida SAS");
        owner.request().body(Map.of("email", "tech@example.com")).put("/console/contacts/TECHNICAL").then().statusCode(200);
        String expired = link(accountId, Category.TECHNICAL, OffsetDateTime.now().minusMinutes(1));

        given().post("/console/contact-verifications/" + expired).then().statusCode(404);
        given().post("/console/contact-verifications/" + token()).then().statusCode(404);
        given().post("/console/contact-verifications/short").then().statusCode(400);
        // Like the rest of /console/**, not reachable through the public domain.
        given().header("Host", "cetus-api.cantte.com").get("/console/contact-verifications/" + expired)
                .then().statusCode(404);
    }

    /** What the worker does when it emails the link. */
    private static String link(String accountId, Category category, OffsetDateTime expiresAt) {
        String token = token();
        QuarkusTransaction.requiringNew().run(() -> AccountContactEntity.update(
                "pendingTokenHash = ?1, pendingExpiresAt = ?2 where accountId = ?3 and category = ?4",
                ApiKeys.hash(token), expiresAt, UUID.fromString(accountId), category));
        return token;
    }

    private static String token() {
        byte[] secret = new byte[32];
        RANDOM.nextBytes(secret);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(secret);
    }
}
