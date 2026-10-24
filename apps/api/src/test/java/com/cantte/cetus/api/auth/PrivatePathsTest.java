package com.cantte.cetus.api.auth;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.not;

import io.quarkus.test.junit.QuarkusTest;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** /console/** and /q/** answer only private hosts; the integrator API stays public. */
@QuarkusTest
class PrivatePathsTest {

    private static final String PUBLIC = "cetus-api.cantte.com";

    @Test
    void privatePathsAreNotFoundThroughThePublicDomain() {
        given().header("Host", PUBLIC)
                .get("/q/health/ready")
                .then()
                .statusCode(404)
                .body("code", equalTo("not_found"));
        given().header("Host", PUBLIC).get("/q/openapi").then().statusCode(404);
        given().header("Host", PUBLIC).get("/console/account").then().statusCode(404);
        given().header("Host", PUBLIC).get("/admin/me").then().statusCode(404);
        // Encoded or doubled slashes and dot segments do not slip past.
        given().header("Host", PUBLIC)
                .urlEncodingEnabled(false)
                .get("/%63onsole/account")
                .then()
                .statusCode(404);
        given().header("Host", PUBLIC)
                .urlEncodingEnabled(false)
                .get("//console/account")
                .then()
                .statusCode(404);
        given().header("Host", PUBLIC)
                .urlEncodingEnabled(false)
                .get("/v1/../q/openapi")
                .then()
                .statusCode(404);
    }

    @Test
    void privateHostsReachThem() {
        given().header("Host", "api.railway.internal:8080")
                .get("/q/health/ready")
                .then()
                .statusCode(200);
        given().header("Host", "healthcheck.railway.app")
                .get("/q/health/ready")
                .then()
                .statusCode(200);
        // Past the filter, the console API still requires its JWT.
        given().header("Host", "api.railway.internal:8080")
                .get("/console/account")
                .then()
                .statusCode(401);
    }

    @Test
    void theIntegratorApiAndResendWebhookStayPublic() {
        given().header("Host", PUBLIC)
                .get("/v1/invoices/" + UUID.randomUUID())
                .then()
                .statusCode(401)
                .body("code", equalTo("unauthorized"));
        given().header("Host", PUBLIC).post("/internal/email-events").then().statusCode(not(404));
    }

    @Test
    void hostsAreComparedWithoutPort() {
        assertThat(PrivatePaths.host("API.railway.internal:8080")).isEqualTo("api.railway.internal");
        assertThat(PrivatePaths.host("[::1]:8080")).isEqualTo("[::1]");
        assertThat(PrivatePaths.host("localhost")).isEqualTo("localhost");
        assertThat(PrivatePaths.isPrivatePath("/console")).isFalse();
        assertThat(PrivatePaths.isPrivatePath("/consoles/x")).isFalse();
        assertThat(PrivatePaths.isPrivatePath("/q/health")).isTrue();
        assertThat(PrivatePaths.isPrivatePath("//Console/account")).isTrue();
        assertThat(PrivatePaths.isPrivatePath("/admin/accounts")).isTrue();
        assertThat(PrivatePaths.isPrivatePath("/administrators")).isFalse();
    }
}
