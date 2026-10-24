package com.cantte.cetus.api.console;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static com.cantte.cetus.api.support.ConsoleFixtures.issuerRequest;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.specification.RequestSpecification;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class OrganizationRoleFilterTest {

    private record Change(String method, String path, Object body) {}

    @Test
    void onlyOwnersAndAdminsChangeTheKeysTheWebhooksAndTheIssuers() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Roles SAS");
        String issuerId = createIssuer(owner);
        String keyId = owner.request()
                .body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then()
                .statusCode(200)
                .extract()
                .path("key.id");
        UUID missing = UUID.randomUUID();
        List<Change> changes = List.of(
                new Change("POST", "/console/api-keys", Map.of("name", "Otra", "environment", "TEST")),
                new Change("DELETE", "/console/api-keys/" + keyId, null),
                new Change(
                        "POST",
                        "/console/webhook-endpoints",
                        Map.of("url", "https://hooks.example.com", "environment", "TEST")),
                new Change("DELETE", "/console/webhook-endpoints/" + missing, null),
                new Change("POST", "/console/webhook-endpoints/" + missing + "/enable", Map.of()),
                new Change("POST", "/console/webhook-endpoints/" + missing + "/deliveries/" + missing + "/retry", null),
                new Change("POST", "/console/issuers", issuerRequest("800197268", "TEST")),
                new Change("PUT", "/console/issuers/" + issuerId, Map.of()),
                new Change("PUT", "/console/issuers/" + issuerId + "/software", Map.of()),
                new Change("PUT", "/console/issuers/" + issuerId + "/certificate", Map.of()),
                new Change("POST", "/console/issuers/" + issuerId + "/promote", null),
                new Change("POST", "/console/issuers/" + issuerId + "/numbering-ranges", Map.of()),
                new Change(
                        "POST",
                        "/console/issuers/" + issuerId + "/numbering-ranges/" + missing + "/verification",
                        null));

        ConsoleUser member = owner.member("member");
        for (Change change : changes) {
            RequestSpecification request = member.request();
            if (change.body() != null) {
                request.body(change.body());
            }
            request.request(change.method(), change.path())
                    .then()
                    .statusCode(403)
                    .body("code", equalTo("organization_role_forbidden"));
        }

        for (String path : List.of(
                "/console/api-keys",
                "/console/api-keys/" + keyId,
                "/console/webhook-endpoints",
                "/console/issuers",
                "/console/issuers/" + issuerId,
                "/console/issuers/" + issuerId + "/numbering-ranges")) {
            member.request().get(path).then().statusCode(200);
        }

        ConsoleUser admin = owner.member("member", "admin");
        admin.request()
                .body(Map.of("name", "Integración", "environment", "TEST"))
                .post("/console/api-keys")
                .then()
                .statusCode(200);
        admin.request()
                .body(issuerRequest("800197268", "TEST"))
                .post("/console/issuers")
                .then()
                .statusCode(200);
        admin.request().delete("/console/api-keys/" + keyId).then().statusCode(204);
    }

    @Test
    void aTokenWithoutOrganizationRolesCannotChangeTheIssuers() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Sin Roles SAS");

        owner.withoutOrganizationRoles()
                .request()
                .body(issuerRequest("800197268", "TEST"))
                .post("/console/issuers")
                .then()
                .statusCode(403)
                .body("code", equalTo("organization_role_forbidden"));
    }
}
