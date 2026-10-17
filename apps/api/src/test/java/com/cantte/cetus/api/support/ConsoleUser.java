package com.cantte.cetus.api.support;

import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import io.smallrye.jwt.build.Jwt;

import java.util.UUID;

import static io.restassured.RestAssured.given;

/** A console user with its own organization, calling the API the way the console BFF does. */
public record ConsoleUser(String userId, String organizationId) {

    public static final String CLIENT_IP = "203.0.113.10";
    public static final String CLIENT_USER_AGENT = "Mozilla/5.0 (CetusTest)";

    public static ConsoleUser newOrganization() {
        return new ConsoleUser("user_" + UUID.randomUUID(), "org_" + UUID.randomUUID());
    }

    public String token() {
        return Jwt.issuer("https://console.test")
                .subject(userId)
                .audience("cetus-api")
                .claim("org", organizationId)
                .sign();
    }

    public RequestSpecification request() {
        return given()
                .auth().oauth2(token())
                .contentType(ContentType.JSON)
                .header("X-Cetus-Client-IP", CLIENT_IP)
                .header("X-Cetus-Client-User-Agent", CLIENT_USER_AGENT);
    }
}
