package com.cantte.cetus.api.invoices;

import com.cantte.cetus.api.support.ConsoleFixtures;
import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

/** JSON columns keep the format of the rows already stored, whatever mapper Hibernate would use by default. */
@QuarkusTest
class JsonColumnsTest {

    @Inject
    EntityManager entityManager;

    @Test
    void datesAreStoredAsIsoStrings() {
        ConsoleUser user = ConsoleUser.newOrganization();
        ConsoleFixtures.bootstrap(user, "Json columns SAS");
        String issuerId = ConsoleFixtures.onboard(user).issuerId();
        String apiKey = user.request().body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then().statusCode(200).extract().path("secret");
        String body = """
                {"issuerId": "%s",
                 "customer": {"personType": "NATURAL_PERSON", "identificationType": "CITIZEN_ID",
                              "identificationNumber": "1020304050", "legalName": "Consumidor Final"},
                 "payment": {"method": "CREDIT", "meansCode": "10", "dueDate": "2026-11-30"},
                 "lines": [{"itemCode": "SERV-1", "description": "Servicio", "quantity": 1, "unitPrice": 100}]}
                """.formatted(issuerId);
        String id = given().header("Authorization", "Bearer " + apiKey).contentType(ContentType.JSON)
                .header("Idempotency-Key", UUID.randomUUID().toString()).body(body)
                .post("/v1/invoices")
                .then().statusCode(202).extract().path("id");

        Object dueDate = entityManager
                .createNativeQuery("select payment ->> 'dueDate' from billing.documents where id = cast(?1 as uuid)")
                .setParameter(1, id)
                .getSingleResult();
        assertThat(dueDate).isEqualTo("2026-11-30");
    }
}
