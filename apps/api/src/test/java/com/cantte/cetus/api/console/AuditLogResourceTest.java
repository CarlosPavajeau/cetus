package com.cantte.cetus.api.console;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

@QuarkusTest
class AuditLogResourceTest {

    @Test
    void requiresAJwt() {
        given().get("/console/audit-log").then().statusCode(401);
    }

    @Test
    void onlyReturnsTheActiveAccountsRows() {
        ConsoleUser alice = ConsoleUser.newOrganization();
        ConsoleUser bob = ConsoleUser.newOrganization();
        String aliceAccount = bootstrap(alice, "Alice SAS");
        bootstrap(bob, "Bob SAS");
        createKey(bob, "Bob ERP");

        List<Map<String, Object>> items = AuditTrailTest.entries(alice, null);
        assertThat(items)
                .singleElement()
                .satisfies(entry -> assertThat(entry)
                        .containsEntry("action", "ACCOUNT_CREATED")
                        .containsEntry("resourceId", aliceAccount)
                        .containsEntry("actorId", alice.userId()));
    }

    @Test
    void paginatesWithACursorAndFiltersByAction() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Pages SAS");
        createKey(user, "First");
        createKey(user, "Second");

        JsonPath first = page(user, Map.of("limit", 2));
        List<Map<String, Object>> firstItems = first.getList("items");
        assertThat(firstItems)
                .extracting(entry -> entry.get("action"))
                .containsExactly("API_KEY_CREATED", "API_KEY_CREATED");
        long cursor = first.getLong("nextCursor");
        assertThat(cursor).isEqualTo(((Number) firstItems.get(1).get("id")).longValue());

        JsonPath second = page(user, Map.of("limit", 2, "before", cursor));
        assertThat(second.getList("items")).hasSize(1);
        assertThat(second.<Object>get("nextCursor")).isNull();

        JsonPath filtered = page(user, Map.of("action", "ACCOUNT_CREATED"));
        assertThat(filtered.getList("items.action")).containsExactly("ACCOUNT_CREATED");
        assertThat(filtered.<Object>get("nextCursor")).isNull();
    }

    @Test
    void returnsOneEntryOfTheActiveAccount() {
        ConsoleUser alice = ConsoleUser.newOrganization();
        ConsoleUser bob = ConsoleUser.newOrganization();
        String aliceAccount = bootstrap(alice, "Alice One SAS");
        bootstrap(bob, "Bob One SAS");
        long id = ((Number) AuditTrailTest.entries(alice, null).getFirst().get("id")).longValue();

        alice.request()
                .get("/console/audit-log/{id}", id)
                .then()
                .statusCode(200)
                .body("action", equalTo("ACCOUNT_CREATED"))
                .body("resourceId", equalTo(aliceAccount));
        bob.request().get("/console/audit-log/{id}", id).then().statusCode(404);
        alice.request().get("/console/audit-log/{id}", Long.MAX_VALUE).then().statusCode(404);
    }

    @Test
    void rejectsAnUnknownAction() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Bad Filter SAS");
        user.request()
                .queryParam("action", "DROP_TABLE")
                .get("/console/audit-log")
                .then()
                .statusCode(400);
    }

    private static void createKey(ConsoleUser user, String name) {
        user.request()
                .body(Map.of("name", name, "environment", "TEST"))
                .post("/console/api-keys")
                .then()
                .statusCode(200);
    }

    private static JsonPath page(ConsoleUser user, Map<String, ?> query) {
        return user.request()
                .queryParams(query)
                .get("/console/audit-log")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath();
    }
}
