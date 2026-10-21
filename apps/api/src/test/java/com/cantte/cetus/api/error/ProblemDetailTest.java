package com.cantte.cetus.api.error;

import com.cantte.cetus.api.support.ConsoleUser;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.not;

/** Every error is an RFC 9457 problem detail, whichever layer produced it. */
@QuarkusTest
class ProblemDetailTest {

    @Test
    void mappedExceptionsAreProblemDetails() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Problem SAS");
        String path = "/console/documents/" + UUID.randomUUID();

        user.request().get(path)
                .then().statusCode(404)
                .contentType(ProblemDetail.MEDIA_TYPE)
                .body("type", equalTo("about:blank"))
                .body("title", equalTo("Not Found"))
                .body("status", equalTo(404))
                .body("instance", equalTo(path))
                .body("$", not(hasKey("errors")));
    }

    @Test
    void instanceKeepsThePathEscaped() {
        ConsoleUser user = ConsoleUser.newOrganization();
        bootstrap(user, "Escaped SAS");
        String path = "/console/documents/a%23b";

        user.request().urlEncodingEnabled(false).get(path)
                .then().statusCode(404)
                .contentType(ProblemDetail.MEDIA_TYPE)
                .body("instance", equalTo(path));
    }
}
