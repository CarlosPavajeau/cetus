package com.cantte.cetus.api.leads;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;

import com.cantte.cetus.api.leads.LeadViews.CalculatorAnswers;
import com.cantte.cetus.api.leads.LeadViews.CalculatorLeadRequest;
import com.cantte.cetus.api.leads.LeadViews.IntegrationLeadRequest;
import com.cantte.cetus.api.leads.LeadViews.PartnerLeadRequest;
import com.cantte.cetus.domain.dian.InvoicingObligation.Answer;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.LeadEntity;
import com.cantte.cetus.persistence.entity.LeadEntity.Integration;
import com.cantte.cetus.persistence.entity.LeadEntity.Kind;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;

@QuarkusTest
class PublicLeadResourceTest {

    private static final String POLICY = "2026-11-03";
    private static final CalculatorAnswers NATURAL_UNDER_THE_CAP =
            new CalculatorAnswers(PersonType.NATURAL_PERSON, Answer.NO, Answer.NO, Answer.NO, Answer.NO);

    @Test
    void theCalculatorKeepsTheAnswersAndQueuesTheEmail() {
        String email = email();

        visitor(ip())
                .body(new CalculatorLeadRequest(email, POLICY, NATURAL_UNDER_THE_CAP))
                .post("/console/public/leads/calculator")
                .then()
                .statusCode(204);

        LeadEntity lead = lead(email);
        assertThat(lead.kind).isEqualTo(Kind.CALCULATOR);
        assertThat(lead.policyVersion).isEqualTo(POLICY);
        assertThat(lead.details).containsEntry("personType", "NATURAL_PERSON").containsEntry("simpleRegime", "NO");
        assertThat(jobs(lead.id)).isEqualTo(1);
    }

    @Test
    void aLegalEntityAnswersOnlyItsPersonType() {
        visitor(ip())
                .body(new CalculatorLeadRequest(
                        email(), POLICY, new CalculatorAnswers(PersonType.LEGAL_ENTITY, Answer.NO, null, null, null)))
                .post("/console/public/leads/calculator")
                .then()
                .statusCode(422)
                .body("code", equalTo("calculator_answers_invalid"));

        String email = email();
        visitor(ip())
                .body(new CalculatorLeadRequest(
                        email, POLICY, new CalculatorAnswers(PersonType.LEGAL_ENTITY, null, null, null, null)))
                .post("/console/public/leads/calculator")
                .then()
                .statusCode(204);
        assertThat(lead(email).details).containsEntry("personType", "LEGAL_ENTITY");
    }

    @Test
    void anAddressAndAPolicyVersionAreRequired() {
        visitor(ip())
                .body(new CalculatorLeadRequest("nadie@ejemplo?.com", POLICY, NATURAL_UNDER_THE_CAP))
                .post("/console/public/leads/calculator")
                .then()
                .statusCode(400);
        visitor(ip())
                .body(new IntegrationLeadRequest(email(), null, Integration.SHOPIFY))
                .post("/console/public/leads/integrations")
                .then()
                .statusCode(400);
    }

    @Test
    void partnersAndIntegrationsKeepWhatTheirFormsAsk() {
        String partner = email();
        visitor(ip())
                .body(new PartnerLeadRequest(partner, POLICY, " Ana Contadora ", "  ", "+57 300 000 0000", 12, null))
                .post("/console/public/leads/partners")
                .then()
                .statusCode(204);
        assertThat(lead(partner).details)
                .containsEntry("name", "Ana Contadora")
                .containsEntry("company", null)
                .containsEntry("phone", "+57 300 000 0000")
                .containsEntry("companies", 12);

        String waiting = email();
        visitor(ip())
                .body(new IntegrationLeadRequest(waiting, POLICY, Integration.WOOCOMMERCE))
                .post("/console/public/leads/integrations")
                .then()
                .statusCode(204);
        LeadEntity lead = lead(waiting);
        assertThat(lead.kind).isEqualTo(Kind.INTEGRATION);
        assertThat(lead.details).containsEntry("integration", "WOOCOMMERCE");
    }

    @Test
    void anAddressGetsAFewOfEachFormADay() {
        String email = email();
        for (int i = 0; i < Leads.PER_EMAIL; i++) {
            visitor(ip())
                    .body(new IntegrationLeadRequest(email, POLICY, Integration.SHOPIFY))
                    .post("/console/public/leads/integrations")
                    .then()
                    .statusCode(204);
        }
        visitor(ip())
                .body(new IntegrationLeadRequest(email.toUpperCase(), POLICY, Integration.SHOPIFY))
                .post("/console/public/leads/integrations")
                .then()
                .statusCode(429)
                .header("Retry-After", equalTo("1800"))
                .body("code", equalTo("leads_too_many"));
        visitor(ip())
                .body(new CalculatorLeadRequest(email, POLICY, NATURAL_UNDER_THE_CAP))
                .post("/console/public/leads/calculator")
                .then()
                .statusCode(204);
    }

    @Test
    void anIpGetsAFewAnHour() {
        String ip = ip();
        for (int i = 0; i < Leads.PER_IP; i++) {
            visitor(ip)
                    .body(new IntegrationLeadRequest(email(), POLICY, Integration.PAYMENTS))
                    .post("/console/public/leads/integrations")
                    .then()
                    .statusCode(204);
        }
        visitor(ip)
                .body(new IntegrationLeadRequest(email(), POLICY, Integration.PAYMENTS))
                .post("/console/public/leads/integrations")
                .then()
                .statusCode(429);
        visitor(ip())
                .body(new IntegrationLeadRequest(email(), POLICY, Integration.PAYMENTS))
                .post("/console/public/leads/integrations")
                .then()
                .statusCode(204);
    }

    @Test
    void theLandingShowsTheFiguresAndTheCap() {
        given().get("/console/public/landing")
                .then()
                .statusCode(200)
                .body("acceptedDocuments", greaterThanOrEqualTo(0))
                .body("activeIssuers", greaterThanOrEqualTo(0))
                .body("obligationCap.uvtValueCop", equalTo(50_000))
                .body("obligationCap.uvt", equalTo(3_500));
    }

    private static RequestSpecification visitor(String ip) {
        return given().contentType(ContentType.JSON).header("X-Cetus-Client-IP", ip);
    }

    private static String ip() {
        ThreadLocalRandom random = ThreadLocalRandom.current();
        return "10.%d.%d.%d".formatted(random.nextInt(256), random.nextInt(256), random.nextInt(1, 255));
    }

    private static String email() {
        return "prospecto-" + UUID.randomUUID() + "@ejemplo.com";
    }

    private static LeadEntity lead(String email) {
        return QuarkusTransaction.requiringNew().call(() -> {
            List<LeadEntity> found = LeadEntity.list("email", email);
            assertThat(found).hasSize(1);
            return found.getFirst();
        });
    }

    private static long jobs(UUID leadId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> JobEntity.count("jobType = ?1 and referenceId = ?2", JobTypes.SEND_LEAD, leadId));
    }
}
