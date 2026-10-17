package com.cantte.cetus.api.console;

import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.assertj.core.api.Assertions.assertThat;

@QuarkusTest
class ApiKeyResourceTest {

    @Test
    void createReturnsTheStoredCreationTime() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Keys SAS");

        JsonPath created = user.request().body(Map.of("name", "ERP", "environment", "TEST"))
                .post("/console/api-keys")
                .then().statusCode(200).extract().jsonPath();
        String createdAt = created.getString("key.createdAt");

        assertThat(createdAt).as("createdAt is required in the OpenAPI spec").isNotNull();
        JsonPath listed = user.request().get("/console/api-keys").then().statusCode(200).extract().jsonPath();
        assertThat(listed.getString("find { it.id == '%s' }.createdAt".formatted(created.getString("key.id"))))
                .isEqualTo(createdAt);
    }
}
