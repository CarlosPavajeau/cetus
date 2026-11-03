package com.cantte.cetus.worker.handlers;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.domain.dian.InvoicingObligation.Answer;
import com.cantte.cetus.domain.dian.InvoicingObligation.Answers;
import com.cantte.cetus.domain.model.PersonType;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.LeadEntity;
import com.cantte.cetus.persistence.entity.LeadEntity.Integration;
import com.cantte.cetus.persistence.entity.LeadEntity.IntegrationDetails;
import com.cantte.cetus.persistence.entity.LeadEntity.Kind;
import com.cantte.cetus.persistence.entity.LeadEntity.PartnerDetails;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.FakeResend;
import com.cantte.cetus.worker.support.FakeResendResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
@QuarkusTestResource(FakeResendResource.class)
class SendLeadHandlerTest {

    @Inject
    SendLeadHandler handler;

    @Inject
    WorkerFixtures fixtures;

    @Inject
    FakeResend resend;

    @Inject
    ObjectMapper mapper;

    @BeforeEach
    void reset() {
        resend.reset();
    }

    @Test
    void theCalculatorTellsTheTeamAndSendsThePersonTheirResult() {
        String email = email();
        UUID id = lead(
                Kind.CALCULATOR,
                email,
                new Answers(PersonType.NATURAL_PERSON, Answer.NO, Answer.UNKNOWN, Answer.NO, Answer.NO));

        handler.handle(fixtures.pendingJob(JobTypes.SEND_LEAD, id));

        assertThat(resend.requests()).hasSize(2);
        JsonNode team = resend.requests().get(0).body();
        assertThat(team.get("to").get(0).asText()).isEqualTo("soporte@cetus.test");
        assertThat(team.get("reply_to").get(0).asText()).isEqualTo(email);
        assertThat(team.get("subject").asText()).isEqualTo("[Prospecto · Calculadora] " + email);
        assertThat(team.get("text").asText()).contains("Revisa con tu contador");
        assertThat(resend.requests().get(0).idempotencyKey()).isEqualTo("lead-" + id + "-team");

        JsonNode result = resend.requests().get(1).body();
        assertThat(result.get("to").get(0).asText()).isEqualTo(email);
        assertThat(result.get("subject").asText())
                .isEqualTo("[Cetus] Revisa con tu contador si debes facturar electrónicamente");
        assertThat(result.get("text").asText())
                .contains("respondiste «No sé»")
                .contains("- Ingresos brutos de 3.500 UVT o más, el año pasado o este: No sé")
                .contains("/estoy-obligado-a-facturar");
        assertThat(resend.requests().get(1).idempotencyKey()).isEqualTo("lead-" + id + "-visitor");
        assertThat(resend.memberships()).isEmpty();
    }

    @Test
    void aPartnerOnlyReachesTheTeam() {
        String email = email();
        UUID id = lead(
                Kind.PARTNER,
                email,
                new PartnerDetails("Ana <Contadora>", null, "+57 300 000 0000", 12, "Manejo tiendas"));

        handler.handle(fixtures.pendingJob(JobTypes.SEND_LEAD, id));

        assertThat(resend.requests()).singleElement().satisfies(request -> {
            assertThat(request.body().get("subject").asText()).isEqualTo("[Prospecto · Socios] " + email);
            assertThat(request.body().get("html").asText())
                    .contains("Ana &lt;Contadora&gt;")
                    .contains("<td style=\"white-space:pre-wrap\">12</td>");
        });
    }

    @Test
    void avisameJoinsTheIntegrationsList() {
        String email = email();
        UUID id = lead(Kind.INTEGRATION, email, new IntegrationDetails(Integration.AUTOMATIONS));

        handler.handle(fixtures.pendingJob(JobTypes.SEND_LEAD, id));
        handler.handle(fixtures.pendingJob(JobTypes.SEND_LEAD, id));

        assertThat(resend.memberships()).containsExactly(email + "/Avísame · n8n, Make y Zapier");
        assertThat(resend.listAuthorizations()).containsExactly("Bearer " + FakeResendResource.CONTACTS_API_KEY);
        assertThat(resend.requests())
                .allSatisfy(request ->
                        assertThat(request.body().get("subject").asText()).isEqualTo("[Prospecto · Avísame] " + email));
    }

    private UUID lead(Kind kind, String email, Object details) {
        Map<String, Object> map = mapper.convertValue(details, new TypeReference<>() {});
        return QuarkusTransaction.requiringNew().call(() -> {
            LeadEntity lead = new LeadEntity();
            lead.id = Ids.newId();
            lead.kind = kind;
            lead.email = email;
            lead.details = map;
            lead.policyVersion = "2026-11-03";
            lead.persist();
            return lead.id;
        });
    }

    private static String email() {
        return "prospecto-" + UUID.randomUUID() + "@ejemplo.com";
    }
}
