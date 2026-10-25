package com.cantte.cetus.api.auth;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;

import io.quarkus.test.junit.QuarkusTest;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** The docs site tries requests from the browser; no other origin may. */
@QuarkusTest
class CorsTest {

    private static final String DOCS = "http://localhost:3001";

    @Test
    void theDocsSitePassesThePreflightWithoutAKey() {
        given().header("Origin", DOCS)
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "authorization,content-type,idempotency-key")
                .options("/v1/invoices")
                .then()
                .statusCode(200)
                .header("Access-Control-Allow-Origin", equalTo(DOCS))
                .header("Access-Control-Allow-Headers", containsStringIgnoringCase("idempotency-key"))
                .header("Access-Control-Allow-Credentials", not(equalTo("true")));
    }

    @Test
    void responsesExposeTheRequestIdToTheDocsSite() {
        given().header("Origin", DOCS)
                .get("/v1/invoices/" + UUID.randomUUID())
                .then()
                .statusCode(401)
                .header("Access-Control-Allow-Origin", equalTo(DOCS))
                .header("Access-Control-Expose-Headers", containsStringIgnoringCase("X-Request-Id"));
    }

    @Test
    void otherOriginsAreNotAllowed() {
        given().header("Origin", "https://evil.example")
                .header("Access-Control-Request-Method", "POST")
                .options("/v1/invoices")
                .then()
                .header("Access-Control-Allow-Origin", nullValue());
    }
}
