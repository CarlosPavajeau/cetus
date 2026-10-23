package com.cantte.cetus.api.console;

import com.cantte.cetus.api.admin.PlatformRoles;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.AccountContactEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.restassured.path.json.JsonPath;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class ContactResourceTest {

    @Test
    void theOwnerReceivesEveryCategoryFromTheStart() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Contactos SAS");
        bootstrap(owner, "Contactos SAS");

        JsonPath contacts = owner.request().get("/console/contacts").then().statusCode(200).extract().jsonPath();
        assertThat(contacts.getList("category")).containsExactlyInAnyOrder("TECHNICAL", "FISCAL", "BILLING");
        assertThat(contacts.getList("email")).containsOnly(owner.email());
        assertThat(contacts.getList("verifiedAt")).doesNotContainNull();
        assertThat(contacts.getList("pendingEmail")).containsOnlyNulls();
    }

    @Test
    void aNewAddressWaitsForItsVerificationWhileTheCurrentOneKeepsTheNotices() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        String accountId = bootstrap(owner, "Cambios SAS");

        owner.request().body(Map.of("email", "Fiscal@Example.com")).put("/console/contacts/FISCAL")
                .then().statusCode(200)
                .body("email", equalTo(owner.email()))
                .body("pendingEmail", equalTo("fiscal@example.com"));

        NotificationEntity notice = QuarkusTransaction.requiringNew().call(() ->
                NotificationEntity.<NotificationEntity>find("accountId = ?1 and kind = 'CONTACT_VERIFICATION'",
                        UUID.fromString(accountId)).singleResult());
        assertThat(notice.data).containsEntry("email", "fiscal@example.com").containsEntry("category", "FISCAL");
        assertThat(QuarkusTransaction.requiringNew().call(() -> JobEntity.count("jobType = ?1 and referenceId = ?2",
                JobTypes.SEND_NOTIFICATION, notice.id))).isEqualTo(1);

        // Only one request a minute, so the console cannot be used to flood an address.
        owner.request().body(Map.of("email", "otro@example.com")).put("/console/contacts/FISCAL")
                .then().statusCode(422).body("code", equalTo("verification_recently_sent"));
        owner.request().post("/console/contacts/FISCAL/verification")
                .then().statusCode(422).body("code", equalTo("verification_recently_sent"));

        // The same address again is not a new request.
        owner.request().body(Map.of("email", "fiscal@example.com")).put("/console/contacts/FISCAL")
                .then().statusCode(200).body("pendingEmail", equalTo("fiscal@example.com"));

        // Going back to the current address cancels the change.
        owner.request().body(Map.of("email", owner.email())).put("/console/contacts/FISCAL")
                .then().statusCode(200).body("pendingEmail", nullValue());
        owner.request().get("/console/audit-log?action=CONTACT_CHANGE_CANCELED").then().statusCode(200)
                .body("items.size()", equalTo(1));
    }

    @Test
    void aVerificationCanBeResentAfterAMinuteAndCanceled() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        String accountId = bootstrap(owner, "Reenvios SAS");
        owner.request().body(Map.of("email", "tech@example.com")).put("/console/contacts/TECHNICAL")
                .then().statusCode(200);
        QuarkusTransaction.requiringNew().run(() -> AccountContactEntity.update(
                "pendingRequestedAt = ?1, pendingTokenHash = 'old' where accountId = ?2 and category = ?3",
                OffsetDateTime.now().minusMinutes(2), UUID.fromString(accountId), AccountContactEntity.Category.TECHNICAL));

        owner.request().post("/console/contacts/TECHNICAL/verification").then().statusCode(200)
                .body("pendingEmail", equalTo("tech@example.com"));
        assertThat(QuarkusTransaction.requiringNew().call(() -> NotificationEntity.count(
                "accountId = ?1 and kind = 'CONTACT_VERIFICATION'", UUID.fromString(accountId)))).isEqualTo(2);
        // The earlier link stops working.
        assertThat(QuarkusTransaction.requiringNew().call(() -> AccountContactEntity
                .<AccountContactEntity>find("accountId = ?1 and category = ?2", UUID.fromString(accountId),
                        AccountContactEntity.Category.TECHNICAL).singleResult().pendingTokenHash)).isNull();

        owner.request().delete("/console/contacts/TECHNICAL/pending").then().statusCode(200)
                .body("pendingEmail", nullValue());
        owner.request().post("/console/contacts/TECHNICAL/verification")
                .then().statusCode(422).body("code", equalTo("no_pending_change"));
    }

    @Test
    void cancelingDoesNotResetTheLimitOfOneEmailAMinute() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Insistente SAS");
        owner.request().body(Map.of("email", "victima@example.com")).put("/console/contacts/FISCAL")
                .then().statusCode(200);
        owner.request().delete("/console/contacts/FISCAL/pending").then().statusCode(200);

        owner.request().body(Map.of("email", "victima@example.com")).put("/console/contacts/FISCAL")
                .then().statusCode(422).body("code", equalTo("verification_recently_sent"));
    }

    @Test
    void anAccountWithoutContactsStartsFromTheMemberMakingTheChange() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        String accountId = bootstrap(owner, "Antigua SAS");
        QuarkusTransaction.requiringNew().run(() -> AccountContactEntity.delete("accountId", UUID.fromString(accountId)));
        owner.request().get("/console/contacts").then().statusCode(200).body("size()", equalTo(0));

        owner.request().body(Map.of("email", "billing@example.com")).put("/console/contacts/BILLING")
                .then().statusCode(200)
                .body("email", equalTo(owner.email()))
                .body("pendingEmail", equalTo("billing@example.com"));
        assertThat(owner.request().get("/console/contacts").then().statusCode(200).extract().jsonPath()
                .getList("category")).hasSize(3);
    }

    @Test
    void invalidAddressesAndCategoriesAreRefused() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Validaciones SAS");
        owner.request().body(Map.of("email", "no-es-un-correo")).put("/console/contacts/FISCAL").then().statusCode(400);
        owner.request().body(Map.of("email", "a@example.com")).put("/console/contacts/SALES").then().statusCode(404);
    }

    @Test
    void contactsStayWithTheCustomerDuringAnImpersonation() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Suplantada SAS");
        String admin = ConsoleUser.platformStaff(PlatformRoles.ADMIN).userId();

        owner.impersonatedBy(admin).get("/console/contacts").then().statusCode(200);
        for (var call : List.of(
                owner.impersonatedBy(admin).body(Map.of("email", "x@example.com")).put("/console/contacts/FISCAL"),
                owner.impersonatedBy(admin).post("/console/contacts/FISCAL/verification"),
                owner.impersonatedBy(admin).delete("/console/contacts/FISCAL/pending"))) {
            call.then().statusCode(403).body("code", equalTo("impersonation_forbidden"));
        }
    }
}
