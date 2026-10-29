package com.cantte.cetus.worker.handlers;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.aws.DocumentStorage;
import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.FeedbackEntity;
import com.cantte.cetus.persistence.entity.SupportAttachmentEntity;
import com.cantte.cetus.persistence.entity.SupportTicketEntity;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.FakeResend;
import com.cantte.cetus.worker.support.FakeResendResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import com.fasterxml.jackson.databind.JsonNode;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
@QuarkusTestResource(FakeResendResource.class)
class SupportHandlersTest {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};

    @Inject
    SendSupportTicketHandler tickets;

    @Inject
    SendFeedbackHandler feedback;

    @Inject
    WorkerFixtures fixtures;

    @Inject
    FakeResend resend;

    @Inject
    DocumentStorage storage;

    @BeforeEach
    void reset() {
        resend.reset();
    }

    @Test
    void aTicketReachesTheTeamWithItsFilesAndThePersonGetsAReceipt() {
        UUID accountId = account();
        SupportTicketEntity ticket = ticket(accountId, "persona@cliente.test", "No firma <el> certificado");

        tickets.handle(fixtures.pendingJob(JobTypes.SEND_SUPPORT_TICKET, ticket.id));

        assertThat(resend.requests()).hasSize(2);
        JsonNode team = resend.requests().get(0).body();
        assertThat(team.get("to").get(0).asText()).isEqualTo("soporte@cetus.test");
        assertThat(team.get("reply_to").get(0).asText()).isEqualTo("persona@cliente.test");
        assertThat(team.get("subject").asText()).startsWith("[Soporte #" + ticket.number + " · Alta] ");
        assertThat(team.get("html").asText())
                .contains("No firma &lt;el&gt; certificado")
                .contains("/admin/support/" + ticket.id)
                .contains("&quot;page&quot; : &quot;/setup&quot;");
        JsonNode attachment = team.get("attachments").get(0);
        assertThat(attachment.get("filename").asText()).isEqualTo("captura.png");
        assertThat(Base64.getDecoder().decode(attachment.get("content").asText()))
                .isEqualTo(PNG);
        assertThat(resend.requests().get(0).idempotencyKey()).isEqualTo("support-ticket-" + ticket.id);

        JsonNode receipt = resend.requests().get(1).body();
        assertThat(receipt.get("to").get(0).asText()).isEqualTo("persona@cliente.test");
        assertThat(receipt.get("reply_to").get(0).asText()).isEqualTo("soporte@cetus.test");
        assertThat(receipt.get("subject").asText()).isEqualTo("[Cetus] Recibimos tu caso #" + ticket.number);
    }

    @Test
    void feedbackReachesTheTeam() {
        UUID accountId = account();
        UUID id = QuarkusTransaction.requiringNew().call(() -> {
            FeedbackEntity entity = new FeedbackEntity();
            entity.id = Ids.newId();
            entity.accountId = accountId;
            entity.userId = "user_" + UUID.randomUUID();
            entity.userEmail = "idea@cliente.test";
            entity.message = "Exportar a Excel";
            entity.page = "/documents";
            entity.persist();
            return entity.id;
        });

        feedback.handle(fixtures.pendingJob(JobTypes.SEND_FEEDBACK, id));

        assertThat(resend.requests()).singleElement().satisfies(request -> {
            assertThat(request.body().get("to").get(0).asText()).isEqualTo("soporte@cetus.test");
            assertThat(request.body().get("reply_to").get(0).asText()).isEqualTo("idea@cliente.test");
            assertThat(request.body().get("text").asText())
                    .contains("desde /documents")
                    .contains("Exportar a Excel");
        });
    }

    private SupportTicketEntity ticket(UUID accountId, String email, String message) {
        return QuarkusTransaction.requiringNew().call(() -> {
            SupportTicketEntity ticket = new SupportTicketEntity();
            ticket.id = Ids.newId();
            ticket.number = SupportTicketEntity.nextNumber();
            ticket.accountId = accountId;
            ticket.userId = "user_" + UUID.randomUUID();
            ticket.userEmail = email;
            ticket.priority = SupportTicketEntity.Priority.HIGH;
            ticket.message = message;
            Map<String, Object> context = new HashMap<>();
            context.put("page", "/setup");
            context.put("issuer", null);
            ticket.context = context;
            ticket.persist();

            SupportAttachmentEntity attachment = new SupportAttachmentEntity();
            attachment.id = Ids.newId();
            attachment.accountId = accountId;
            attachment.ticketId = ticket.id;
            attachment.fileName = "captura.png";
            attachment.contentType = "image/png";
            attachment.size = PNG.length;
            attachment.storageKey = "support/" + accountId + "/" + attachment.id;
            attachment.persist();
            storage.put(attachment.storageKey, PNG, attachment.contentType);
            return ticket;
        });
    }

    private UUID account() {
        UUID documentId = fixtures.invoice();
        return QuarkusTransaction.requiringNew()
                .call(() -> DocumentEntity.<DocumentEntity>findById(documentId).accountId);
    }
}
