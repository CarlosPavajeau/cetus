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
    void theOwnersAddressWaitsForOneLinkThatVerifiesEveryCategory() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        String accountId = bootstrap(owner, "Contactos SAS");
        bootstrap(owner, "Contactos SAS");

        // Signing up does not prove the address receives email: nothing is verified yet.
        JsonPath contacts = owner.request().get("/console/contacts").then().statusCode(200).extract().jsonPath();
        assertThat(contacts.getList("category")).containsExactlyInAnyOrder("TECHNICAL", "FISCAL", "BILLING");
        assertThat(contacts.getList("email")).containsOnlyNulls();
        assertThat(contacts.getList("verifiedAt")).containsOnlyNulls();
        assertThat(contacts.getList("pendingEmail")).containsOnly(owner.email());

        assertThat(verifications(accountId)).singleElement().satisfies(notice -> assertThat(notice.data)
                .containsEntry("email", owner.email())
                .containsEntry("categories", "TECHNICAL,FISCAL,BILLING"));
    }

    @Test
    void aNewAddressWaitsForItsVerificationWhileTheCurrentOneKeepsTheNotices() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        String accountId = bootstrap(owner, "Cambios SAS");
        verifyOwner(accountId);

        owner.request().body(Map.of("email", "Fiscal@Example.com")).put("/console/contacts/FISCAL")
                .then().statusCode(200)
                .body("email", equalTo(owner.email()))
                .body("pendingEmail", equalTo("fiscal@example.com"));

        NotificationEntity notice = verifications(accountId).stream()
                .filter(n -> "fiscal@example.com".equals(n.data.get("email"))).findFirst().orElseThrow();
        assertThat(notice.data).containsEntry("categories", "FISCAL");
        assertThat(QuarkusTransaction.requiringNew().call(() -> JobEntity.count("jobType = ?1 and referenceId = ?2",
                JobTypes.SEND_NOTIFICATION, notice.id))).isEqualTo(1);

        // One email a minute to an address, so the console cannot be used to flood it.
        owner.request().post("/console/contacts/FISCAL/verification")
                .then().statusCode(422).body("code", equalTo("verification_recently_sent"));
        // The same address again is not a new request.
        owner.request().body(Map.of("email", "fiscal@example.com")).put("/console/contacts/FISCAL")
                .then().statusCode(200).body("pendingEmail", equalTo("fiscal@example.com"));
        // Another address replaces the pending one.
        owner.request().body(Map.of("email", "otro@example.com")).put("/console/contacts/FISCAL")
                .then().statusCode(200).body("pendingEmail", equalTo("otro@example.com"));

        // Going back to the current address cancels the change.
        owner.request().body(Map.of("email", owner.email())).put("/console/contacts/FISCAL")
                .then().statusCode(200).body("pendingEmail", nullValue());
        owner.request().get("/console/audit-log?action=CONTACT_CHANGE_CANCELED").then().statusCode(200)
                .body("items.size()", equalTo(1));
    }

    @Test
    void aVerificationCanBeResentAfterAMinuteForEveryCategoryItCovers() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        String accountId = bootstrap(owner, "Reenvios SAS");
        olderThanAMinute(accountId);

        // From any of the categories the owner's link covers, the new link covers them all again.
        owner.request().post("/console/contacts/BILLING/verification").then().statusCode(200)
                .body("pendingEmail", equalTo(owner.email()));
        List<NotificationEntity> sent = verifications(accountId);
        assertThat(sent).hasSize(2);
        assertThat(sent.get(1).data).containsEntry("categories", "TECHNICAL,FISCAL,BILLING");

        owner.request().delete("/console/contacts/BILLING/pending").then().statusCode(200)
                .body("pendingEmail", nullValue());
        owner.request().post("/console/contacts/BILLING/verification")
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
    void anAccountWithoutContactsGetsItsCategoriesOnTheFirstChange() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        String accountId = bootstrap(owner, "Antigua SAS");
        QuarkusTransaction.requiringNew().run(() -> AccountContactEntity.delete("accountId", UUID.fromString(accountId)));
        owner.request().get("/console/contacts").then().statusCode(200).body("size()", equalTo(0));

        owner.request().body(Map.of("email", "billing@example.com")).put("/console/contacts/BILLING")
                .then().statusCode(200)
                .body("email", nullValue())
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
    void onlyOwnersAndAdminsChangeTheContacts() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Roles SAS");
        ConsoleUser member = owner.member("member");
        ConsoleUser admin = owner.member("member", "admin");

        // Every member sees them.
        member.request().get("/console/contacts").then().statusCode(200).body("size()", equalTo(3));
        for (var call : List.of(
                member.request().body(Map.of("email", "x@example.com")).put("/console/contacts/FISCAL"),
                member.request().post("/console/contacts/FISCAL/verification"),
                member.request().delete("/console/contacts/FISCAL/pending"))) {
            call.then().statusCode(403).body("code", equalTo("organization_role_forbidden"));
        }

        admin.request().body(Map.of("email", "admin-elige@example.com")).put("/console/contacts/FISCAL")
                .then().statusCode(200).body("pendingEmail", equalTo("admin-elige@example.com"));
        admin.request().delete("/console/contacts/FISCAL/pending").then().statusCode(200);
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

    /** What following the owner's link does, without the link. */
    static void verifyOwner(String accountId) {
        QuarkusTransaction.requiringNew().run(() -> AccountContactEntity.update("""
                        email = pendingEmail, verifiedAt = ?1, pendingEmail = null, pendingTokenHash = null,
                        pendingExpiresAt = null, pendingRequestedAt = null where accountId = ?2""",
                OffsetDateTime.now(), UUID.fromString(accountId)));
    }

    private static void olderThanAMinute(String accountId) {
        QuarkusTransaction.requiringNew().run(() -> NotificationEntity.update("createdAt = ?1 where accountId = ?2",
                OffsetDateTime.now().minusMinutes(2), UUID.fromString(accountId)));
    }

    private static List<NotificationEntity> verifications(String accountId) {
        return QuarkusTransaction.requiringNew().call(() -> NotificationEntity.list(
                "accountId = ?1 and kind = 'CONTACT_VERIFICATION' order by createdAt, id", UUID.fromString(accountId)));
    }
}
