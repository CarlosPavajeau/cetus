package com.cantte.cetus.api.admin;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

/** /admin/** needs a console JWT whose "groups" carry a platform role. */
@QuarkusTest
class AdminSessionResourceTest {

    @Test
    void requiresAToken() {
        given().get("/admin/me").then().statusCode(401);
    }

    @Test
    void refusesConsoleUsersWithoutAPlatformRole() {
        ConsoleUser.newOrganization()
                .request()
                .get("/admin/me")
                .then()
                .statusCode(403)
                .body("code", equalTo("forbidden"));
        ConsoleUser.platformStaff("member").request().get("/admin/me").then().statusCode(403);
    }

    @Test
    void acceptsAdminsAndSupport() {
        ConsoleUser admin = ConsoleUser.platformStaff(PlatformRoles.ADMIN);
        admin.request()
                .get("/admin/me")
                .then()
                .statusCode(200)
                .body("userId", equalTo(admin.userId()))
                .body("roles", contains("admin"));
        ConsoleUser.platformStaff(PlatformRoles.SUPPORT)
                .request()
                .get("/admin/me")
                .then()
                .statusCode(200)
                .body("roles", contains("support"));
    }
}
