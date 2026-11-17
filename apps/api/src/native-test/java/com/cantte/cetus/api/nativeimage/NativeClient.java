package com.cantte.cetus.api.nativeimage;

import static io.restassured.RestAssured.given;

import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import io.smallrye.jwt.build.Jwt;
import io.smallrye.jwt.util.KeyUtils;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.GeneralSecurityException;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Calls the binary the way the console BFF and an integrator do. Tokens are signed in this JVM with the test-only
 * key (src/test/resources/test-jwt), since the test profile's signing config does not reach a prod-profile run.
 */
final class NativeClient {

    static final String CERTIFICATE_PASSWORD = "cetus-test";

    private NativeClient() {}

    record ConsoleUser(String userId, String organizationId) {

        static ConsoleUser newOrganization() {
            return new ConsoleUser("user_" + UUID.randomUUID(), "org_" + UUID.randomUUID());
        }

        RequestSpecification request() {
            return request(token(signingKey()));
        }

        RequestSpecification requestSignedByAnotherKey() {
            try {
                KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
                generator.initialize(2048);
                return request(token(generator.generateKeyPair().getPrivate()));
            } catch (GeneralSecurityException e) {
                throw new IllegalStateException(e);
            }
        }

        private String token(PrivateKey key) {
            return Jwt.issuer(NativeStack.JWT_ISSUER)
                    .subject(userId)
                    .audience("cetus-api")
                    .claim("email", userId.toLowerCase() + "@example.test")
                    .claim("org", organizationId)
                    .claim("orgRoles", List.of("owner"))
                    .sign(key);
        }

        private static RequestSpecification request(String token) {
            return given().auth()
                    .oauth2(token)
                    .contentType(ContentType.JSON)
                    .header("X-Cetus-Client-IP", "203.0.113.10")
                    .header("X-Cetus-Client-User-Agent", "Mozilla/5.0 (CetusNativeTest)");
        }
    }

    static RequestSpecification api(String apiKey) {
        return given().auth().oauth2(apiKey).contentType(ContentType.JSON);
    }

    static void bootstrap(ConsoleUser user, String name) {
        user.request()
                .body(Map.of("name", name))
                .post("/console/account")
                .then()
                .statusCode(200);
    }

    static String createIssuer(ConsoleUser user) {
        Map<String, Object> address = Map.of(
                "municipalityCode", "11001",
                "cityName", "Bogotá",
                "departmentCode", "11",
                "departmentName", "Bogotá",
                "postalCode", "110111",
                "line", "Calle 1 # 2-3",
                "countryCode", "CO",
                "countryName", "Colombia");
        Map<String, Object> issuer = Map.of(
                "environment", "TEST",
                "nit", "900123456",
                "legalName", "Acme SAS",
                "personType", "LEGAL_ENTITY",
                "taxLevelCodes", List.of("O-13"),
                "responsibleForIva", true,
                "address", address,
                "email", "facturas@acme.test");
        return user.request()
                .body(issuer)
                .post("/console/issuers")
                .then()
                .statusCode(200)
                .extract()
                .path("id");
    }

    static RequestSpecification uploadCertificate(ConsoleUser user, byte[] pkcs12, String password) {
        return user.request()
                .body(Map.of("pkcs12Base64", Base64.getEncoder().encodeToString(pkcs12), "password", password));
    }

    static byte[] pkcs12(String name) {
        Path file = name.equals("test-signer")
                ? Path.of("src/test/resources/test-signer.p12")
                : Path.of("../../modules/signing/src/test/resources/pkcs12/" + name + ".p12");
        try {
            return Files.readAllBytes(file);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static PrivateKey signingKey() {
        try {
            return KeyUtils.decodePrivateKey(Files.readString(Path.of("src/test/resources/test-jwt/private.pem")));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
