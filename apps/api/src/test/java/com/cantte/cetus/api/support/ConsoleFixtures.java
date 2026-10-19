package com.cantte.cetus.api.support;

import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Console calls that set up an account and a ready-to-invoice issuer, shared by the API tests. */
public final class ConsoleFixtures {

    public static final String PIN = "pin-7f3a91-never-audit";
    public static final String TECHNICAL_KEY = "tk-5b2e88c1-never-audit";
    public static final String CERTIFICATE_PASSWORD = "cetus-test";
    public static final String SOFTWARE_ID = "56f2ae4e-9812-4fad-9255-643fc2bc5d43";

    private ConsoleFixtures() {
    }

    public record Onboarding(String issuerId, String rangeId) {
    }

    public static Onboarding onboard(ConsoleUser user) {
        return onboard(user, "900123456");
    }

    public static Onboarding onboard(ConsoleUser user, String nit) {
        String issuerId = createIssuer(user, nit);
        user.request()
                .body(Map.of("softwareId", SOFTWARE_ID, "pin", PIN, "testSetId", UUID.randomUUID().toString()))
                .put("/console/issuers/" + issuerId + "/software")
                .then().statusCode(200);
        user.request()
                .body(Map.of("pkcs12Base64", certificateBase64(), "password", CERTIFICATE_PASSWORD))
                .put("/console/issuers/" + issuerId + "/certificate")
                .then().statusCode(200);
        String rangeId = addRange(user, issuerId, "SETP");
        return new Onboarding(issuerId, rangeId);
    }

    public static String bootstrap(ConsoleUser user, String name) {
        return user.request().body(Map.of("name", name)).post("/console/account")
                .then().statusCode(200).extract().path("id");
    }

    public static String createIssuer(ConsoleUser user) {
        return createIssuer(user, "900123456");
    }

    public static String createIssuer(ConsoleUser user, String nit) {
        Map<String, Object> address = Map.of(
                "municipalityCode", "11001", "cityName", "Bogotá", "departmentCode", "11",
                "departmentName", "Bogotá", "postalCode", "110111", "line", "Calle 1 # 2-3",
                "countryCode", "CO", "countryName", "Colombia");
        Map<String, Object> request = Map.of(
                "environment", "TEST", "nit", nit, "legalName", "Acme SAS",
                "personType", "LEGAL_ENTITY", "taxLevelCodes", List.of("O-13"), "responsibleForIva", true,
                "address", address, "email", "facturas@acme.test");
        return user.request().body(request).post("/console/issuers")
                .then().statusCode(200).extract().path("id");
    }

    public static String addRange(ConsoleUser user, String issuerId, String prefix) {
        Map<String, Object> request = Map.of(
                "documentType", "INVOICE", "resolutionNumber", "18760000001", "resolutionDate", "2026-01-01",
                "prefix", prefix, "from", 990000000, "to", 995000000, "validFrom", "2026-01-01",
                "validTo", "2030-12-31", "technicalKey", TECHNICAL_KEY);
        return user.request().body(request).post("/console/issuers/" + issuerId + "/numbering-ranges")
                .then().statusCode(200).extract().path("id");
    }

    /** A credit note range as the DIAN expects it: own prefix and consecutive, no resolution or technical key. */
    public static String addCreditNoteRange(ConsoleUser user, String issuerId) {
        Map<String, Object> request = Map.of("documentType", "CREDIT_NOTE", "prefix", "NC", "from", 1, "to", 99999999);
        return user.request().body(request).post("/console/issuers/" + issuerId + "/numbering-ranges")
                .then().statusCode(200).extract().path("id");
    }

    public static String certificateBase64() {
        try (InputStream in = ConsoleFixtures.class.getResourceAsStream("/test-signer.p12")) {
            return Base64.getEncoder().encodeToString(in.readAllBytes());
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
