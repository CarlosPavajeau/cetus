package com.cantte.cetus.api.support;

import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import io.smallrye.jwt.build.Jwt;
import jakarta.json.JsonValue;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static io.restassured.RestAssured.given;

/**
 * A console user with its own organization, calling the API the way the console BFF does. They own the
 * organization unless created with {@link #member}.
 */
public record ConsoleUser(String userId, String organizationId, Set<String> groups, List<String> orgRoles) {

    public static final String CLIENT_IP = "203.0.113.10";
    public static final String CLIENT_USER_AGENT = "Mozilla/5.0 (CetusTest)";

    public ConsoleUser(String userId, String organizationId) {
        this(userId, organizationId, Set.of());
    }

    public ConsoleUser(String userId, String organizationId, Set<String> groups) {
        this(userId, organizationId, groups, List.of("owner"));
    }

    /** Another person in this user's organization, with the given member roles (owner, admin, member). */
    public ConsoleUser member(String... roles) {
        return new ConsoleUser("user_" + UUID.randomUUID(), organizationId, Set.of(), List.of(roles));
    }

    public static ConsoleUser newOrganization() {
        return new ConsoleUser("user_" + UUID.randomUUID(), "org_" + UUID.randomUUID());
    }

    /** A member of the Cetus team with the given platform roles (2FA already checked by the console). */
    public static ConsoleUser platformStaff(String... roles) {
        return new ConsoleUser("user_" + UUID.randomUUID(), "org_" + UUID.randomUUID(), Set.of(roles));
    }

    /** The address the user signs in with: the console puts it in every token. */
    public String email() {
        return userId.toLowerCase() + "@example.test";
    }

    public String token() {
        // The console always sends the claim; null outside an impersonation.
        return token(JsonValue.NULL);
    }

    /** A token of this user's session while the Cetus admin {@code adminId} impersonates them. */
    public String impersonatedToken(String adminId) {
        return token(adminId);
    }

    private String token(Object impersonatedBy) {
        return Jwt.issuer("https://console.test")
                .subject(userId)
                .audience("cetus-api")
                .claim("email", email())
                .claim("org", organizationId)
                .claim("orgRoles", orgRoles)
                .claim("impersonatedBy", impersonatedBy)
                .groups(groups)
                .sign();
    }

    public RequestSpecification request() {
        return request(token());
    }

    public RequestSpecification impersonatedBy(String adminId) {
        return request(impersonatedToken(adminId));
    }

    private static RequestSpecification request(String token) {
        return given()
                .auth().oauth2(token)
                .contentType(ContentType.JSON)
                .header("X-Cetus-Client-IP", CLIENT_IP)
                .header("X-Cetus-Client-User-Agent", CLIENT_USER_AGENT);
    }
}
