package com.cantte.cetus.api.admin;

import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;

/** Bans happen in Better Auth; the API records who banned whom, and why. */
@QuarkusTest
class AdminUserResourceTest {

    private static final ConsoleUser ADMIN = ConsoleUser.platformStaff(PlatformRoles.ADMIN);

    @Test
    void anAdminRecordsABanAndItsLift() {
        String userId = "u" + UUID.randomUUID().toString().replace("-", "");
        String path = "/admin/users/" + userId + "/ban-events";

        ADMIN.request().body(Map.of("type", "BANNED", "email", "spam@example.com", "reason", " Spam ",
                "expiresAt", "2026-11-01T00:00:00Z")).post(path).then().statusCode(204);
        ADMIN.request().body(Map.of("type", "UNBANNED", "email", "spam@example.com", "reason", "Aclarado"))
                .post(path).then().statusCode(204);

        ADMIN.request().queryParam("actorId", ADMIN.userId()).queryParam("action", "USER_BANNED")
                .get("/admin/audit-log").then().statusCode(200)
                .body("items", hasSize(1))
                .body("items[0].accountId", nullValue())
                .body("items[0].actorType", equalTo("PLATFORM"))
                .body("items[0].resourceType", equalTo("user"))
                .body("items[0].data.userId", equalTo(userId))
                .body("items[0].data.reason", equalTo("Spam"))
                .body("items[0].data.expiresAt", equalTo("2026-11-01T00:00Z"));
        ADMIN.request().queryParam("actorId", ADMIN.userId()).queryParam("action", "USER_UNBANNED")
                .get("/admin/audit-log").then()
                .body("items", hasSize(1))
                .body("items[0].data.reason", equalTo("Aclarado"));
    }

    @Test
    void onlyAdminsRecordBansAndTheRequestIsValidated() {
        Map<String, Object> ban = Map.of("type", "BANNED", "email", "spam@example.com", "reason", "Spam");
        ConsoleUser.platformStaff(PlatformRoles.SUPPORT).request().body(ban)
                .post("/admin/users/abc/ban-events").then().statusCode(403);
        ConsoleUser.newOrganization().request().body(ban)
                .post("/admin/users/abc/ban-events").then().statusCode(403);

        ADMIN.request().body(ban).post("/admin/users/not%20an%20id/ban-events").then().statusCode(400);
        ADMIN.request().body(Map.of("type", "BANNED", "email", "spam@example.com", "reason", ""))
                .post("/admin/users/abc/ban-events").then().statusCode(400);
    }
}
