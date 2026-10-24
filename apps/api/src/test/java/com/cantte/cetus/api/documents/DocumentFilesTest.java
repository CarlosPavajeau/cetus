package com.cantte.cetus.api.documents;

import static com.cantte.cetus.api.support.IssuedDocuments.api;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import com.cantte.cetus.api.support.IssuedDocuments;
import com.cantte.cetus.api.support.IssuedDocuments.Issuer;
import com.cantte.cetus.persistence.entity.DocumentArtifactEntity.Kind;
import io.quarkus.test.junit.QuarkusTest;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class DocumentFilesTest {

    @Test
    void answersAShortLivedUrlForEachFile() {
        Issuer issuer = IssuedDocuments.issuer("Files SAS");
        UUID id = IssuedDocuments.invoice(issuer);
        IssuedDocuments.accept(id);
        IssuedDocuments.artifact(id, Kind.SIGNED_XML, "fv-first-attempt.xml");
        String signed = IssuedDocuments.artifact(id, Kind.SIGNED_XML, "fv0900123456000260000000a.xml");
        String pdf = IssuedDocuments.artifact(id, Kind.PDF, "SETP990000001.pdf");
        String attached = IssuedDocuments.artifact(id, Kind.ATTACHED_DOCUMENT, "ad0900123456000260000000a.xml");

        // The XML is the last one signed: the one the DIAN validated.
        assertThat(url(issuer, id, "xml"))
                .isEqualTo("https://s3.test/" + signed + "?filename=fv0900123456000260000000a.xml");
        assertThat(url(issuer, id, "pdf")).startsWith("https://s3.test/" + pdf);
        assertThat(url(issuer, id, "attached-document")).startsWith("https://s3.test/" + attached);

        OffsetDateTime expiresAt = OffsetDateTime.parse(api(issuer.apiKey())
                .get("/v1/invoices/" + id + "/files/pdf")
                .then()
                .statusCode(200)
                .extract()
                .path("expiresAt"));
        assertThat(expiresAt)
                .isBetween(
                        OffsetDateTime.now().plusMinutes(4),
                        OffsetDateTime.now().plusMinutes(6));
    }

    @Test
    void aFileNotGeneratedYetIsNotAvailable() {
        Issuer issuer = IssuedDocuments.issuer("Pending files SAS");
        UUID id = IssuedDocuments.invoice(issuer);

        api(issuer.apiKey())
                .get("/v1/invoices/" + id + "/files/pdf")
                .then()
                .statusCode(404)
                .body("code", equalTo("file_not_available"));
        api(issuer.apiKey())
                .get("/v1/invoices/" + id + "/files/zip")
                .then()
                .statusCode(404)
                .body("code", equalTo("not_found"));
    }

    @Test
    void anotherAccountOrTheWrongTypeIsNotFound() {
        Issuer owner = IssuedDocuments.issuer("Owner files SAS");
        UUID id = IssuedDocuments.invoice(owner);
        IssuedDocuments.artifact(id, Kind.PDF, "SETP1.pdf");
        Issuer other = IssuedDocuments.issuer("Other files SAS");

        api(other.apiKey()).get("/v1/invoices/" + id + "/files/pdf").then().statusCode(404);
        api(owner.apiKey()).get("/v1/credit-notes/" + id + "/files/pdf").then().statusCode(404);
    }

    private static String url(Issuer issuer, UUID id, String file) {
        return api(issuer.apiKey())
                .get("/v1/invoices/" + id + "/files/" + file)
                .then()
                .statusCode(200)
                .extract()
                .path("url");
    }
}
