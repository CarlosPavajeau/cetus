package com.cantte.cetus.api.console;

import static com.cantte.cetus.api.support.ConsoleFixtures.CERTIFICATE_PASSWORD;
import static com.cantte.cetus.api.support.ConsoleFixtures.PIN;
import static com.cantte.cetus.api.support.ConsoleFixtures.TECHNICAL_KEY;
import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;

import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * The issuer's data goes into every document it issues: the XML, the QR, the PDF and the subject of the
 * delivery email. What would change their structure is refused when the issuer is set up, before any
 * document takes a consecutive number with it.
 */
@QuarkusTest
class IssuerInputHardeningTest {

    @Test
    void legalNameCannotAddLinesToTheEmailSubject() {
        ConsoleUser user = organization();
        Map<String, Object> request = issuer();
        request.put("legalName", "Acme SAS\r\nBcc: someone@example.com");

        user.request()
                .body(request)
                .post("/console/issuers")
                .then()
                .statusCode(400)
                .body("errors.field", hasItem("legalName"))
                .body("errors.message", hasItem("must match \"[^\\r\\n]*\""));
    }

    @Test
    void updateKeepsTheSameRules() {
        ConsoleUser user = organization();
        String issuerId = createIssuer(user);
        Map<String, Object> request = issuer();
        request.remove("environment");
        request.remove("nit");
        request.put("tradeName", "Acme\nNIT: 800000000");

        user.request().body(request).put("/console/issuers/" + issuerId).then().statusCode(400);
    }

    @Test
    void addressIsValidated() {
        ConsoleUser user = organization();
        Map<String, Object> request = issuer();
        request.put(
                "address",
                Map.of(
                        "municipalityCode",
                        "11001'; --",
                        "cityName",
                        "Bogotá",
                        "departmentCode",
                        "11",
                        "departmentName",
                        "Bogotá",
                        "line",
                        "Calle 1 # 2-3"));

        user.request().body(request).post("/console/issuers").then().statusCode(400);
    }

    @Test
    void emailIsAPlainAddress() {
        ConsoleUser user = organization();
        Map<String, Object> request = issuer();
        // Valid for @Email alone; it becomes the Reply-To of every email to the issuer's customers.
        request.put("email", "\"facturas,otro@example.com\"@acme.test");

        user.request().body(request).post("/console/issuers").then().statusCode(400);
    }

    @Test
    void taxLevelCodesComeFromTheDianList() {
        ConsoleUser user = organization();
        Map<String, Object> request = issuer();
        // The codes are stored joined by ";": one with a ";" would read as two.
        request.put("taxLevelCodes", List.of("O-13;O-15"));

        user.request().body(request).post("/console/issuers").then().statusCode(400);
    }

    @Test
    void prefixCannotAddLinesToTheQr() {
        ConsoleUser user = organization();
        String issuerId = createIssuer(user);
        Map<String, Object> range = range();
        range.put("prefix", "SE\nhttps://evil.example/");

        user.request()
                .body(range)
                .post("/console/issuers/" + issuerId + "/numbering-ranges")
                .then()
                .statusCode(400);
    }

    @Test
    void technicalKeyAndResolutionHaveNoSpaces() {
        ConsoleUser user = organization();
        String issuerId = createIssuer(user);
        Map<String, Object> range = range();
        range.put("technicalKey", "abc def");
        range.put("resolutionNumber", "1876 0000");

        user.request()
                .body(range)
                .post("/console/issuers/" + issuerId + "/numbering-ranges")
                .then()
                .statusCode(400);
    }

    @Test
    void softwareIdIsTheUuidOfTheDianPortal() {
        ConsoleUser user = organization();
        String issuerId = createIssuer(user);

        user.request()
                .body(Map.of("softwareId", "</wcf:softwareCode>", "pin", PIN))
                .put("/console/issuers/" + issuerId + "/software")
                .then()
                .statusCode(400);
    }

    @Test
    void certificateThatIsNotBase64IsInvalid() {
        ConsoleUser user = organization();
        String issuerId = createIssuer(user);

        user.request()
                .body(Map.of("pkcs12Base64", "not base64!", "password", CERTIFICATE_PASSWORD))
                .put("/console/issuers/" + issuerId + "/certificate")
                .then()
                .statusCode(422)
                .body("code", equalTo("certificate_invalid"));
    }

    @Test
    void certificateIsBounded() {
        ConsoleUser user = organization();
        String issuerId = createIssuer(user);

        user.request()
                .body(Map.of(
                        "pkcs12Base64",
                        "A".repeat(IssuerViews.MAX_PKCS12_BASE64 + 4),
                        "password",
                        CERTIFICATE_PASSWORD))
                .put("/console/issuers/" + issuerId + "/certificate")
                .then()
                .statusCode(400);
    }

    private static ConsoleUser organization() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Hardening SAS");
        return user;
    }

    private static Map<String, Object> issuer() {
        Map<String, Object> address = Map.of(
                "municipalityCode",
                "11001",
                "cityName",
                "Bogotá",
                "departmentCode",
                "11",
                "departmentName",
                "Bogotá",
                "postalCode",
                "110111",
                "line",
                "Calle 1 # 2-3",
                "countryCode",
                "CO",
                "countryName",
                "Colombia");
        return new HashMap<>(Map.of(
                "environment",
                "TEST",
                "nit",
                "900123456",
                "legalName",
                "Acme SAS",
                "personType",
                "LEGAL_ENTITY",
                "taxLevelCodes",
                List.of("O-13"),
                "responsibleForIva",
                true,
                "address",
                address,
                "email",
                "facturas@acme.test"));
    }

    private static Map<String, Object> range() {
        return new HashMap<>(Map.of(
                "documentType",
                "INVOICE",
                "resolutionNumber",
                "18760000001",
                "resolutionDate",
                "2026-01-01",
                "prefix",
                "SETP",
                "from",
                1,
                "to",
                1000,
                "validFrom",
                "2026-01-01",
                "validTo",
                "2030-12-31",
                "technicalKey",
                TECHNICAL_KEY));
    }
}
