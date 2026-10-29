package com.cantte.cetus.api.help;

import static com.cantte.cetus.api.support.ConsoleFixtures.bootstrap;
import static com.cantte.cetus.api.support.ConsoleFixtures.createIssuer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;

import com.cantte.cetus.api.admin.PlatformRoles;
import com.cantte.cetus.api.help.HelpViews.ChangeTicketStatusRequest;
import com.cantte.cetus.api.help.HelpViews.CreateTicketRequest;
import com.cantte.cetus.api.help.HelpViews.FeedbackRequest;
import com.cantte.cetus.api.help.HelpViews.UploadAttachmentRequest;
import com.cantte.cetus.api.support.ConsoleUser;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.jobs.JobTypes;
import com.cantte.cetus.persistence.entity.FeedbackEntity;
import com.cantte.cetus.persistence.entity.JobEntity;
import com.cantte.cetus.persistence.entity.SupportTicketEntity.Priority;
import com.cantte.cetus.persistence.entity.SupportTicketEntity.Status;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.path.json.JsonPath;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class SupportTicketResourceTest {

    private static final ConsoleUser ADMIN = ConsoleUser.platformStaff(PlatformRoles.ADMIN);
    private static final ConsoleUser SUPPORT = ConsoleUser.platformStaff(PlatformRoles.SUPPORT);
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13};

    @Test
    void aTicketCarriesTheIssuersStateAndItsAttachmentsToTheTeam() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        String accountId = bootstrap(owner, "Ayuda SAS");
        String issuerId = createIssuer(owner, "900765432");
        String attachmentId = upload(owner, "captura.png", PNG);

        JsonPath ticket = owner.request()
                .body(new CreateTicketRequest(
                        "  El paso del certificado no avanza  ",
                        Priority.HIGH,
                        UUID.fromString(issuerId),
                        null,
                        "/setup?step=3",
                        List.of(UUID.fromString(attachmentId))))
                .post("/console/support-tickets")
                .then()
                .statusCode(201)
                .body("message", equalTo("El paso del certificado no avanza"))
                .body("status", equalTo("OPEN"))
                .body("userEmail", equalTo(owner.email()))
                .body("attachments", hasSize(1))
                .body("attachments[0].contentType", equalTo("image/png"))
                .extract()
                .jsonPath();
        String ticketId = ticket.getString("id");
        assertThat(ticket.getLong("number")).isPositive();
        assertThat(jobs(JobTypes.SEND_SUPPORT_TICKET, ticketId)).isEqualTo(1);

        // Every member sees the organization's tickets; another organization does not.
        owner.member("member")
                .request()
                .get("/console/support-tickets")
                .then()
                .statusCode(200)
                .body("items.id", equalTo(List.of(ticketId)));
        ConsoleUser stranger = ConsoleUser.newOrganization();
        bootstrap(stranger, "Otra SAS");
        stranger.request()
                .get("/console/support-tickets")
                .then()
                .statusCode(200)
                .body("items", hasSize(0));

        SUPPORT.request()
                .get("/admin/support-tickets/" + ticketId)
                .then()
                .statusCode(200)
                .body("accountName", equalTo("Ayuda SAS"))
                .body("context.account.id", equalTo(accountId))
                .body("context.environment", equalTo("TEST"))
                .body("context.page", equalTo("/setup?step=3"))
                .body("context.organizationRoles", equalTo(List.of("owner")))
                .body("context.issuer.id", equalTo(issuerId))
                .body("context.issuer.status", equalTo("ONBOARDING"))
                .body("attachments[0].fileName", equalTo("captura.png"))
                .body("attachments[0].url", startsWith("https://s3.test/support/" + accountId + "/"));

        // An attachment goes with one ticket only.
        owner.request()
                .body(request(List.of(UUID.fromString(attachmentId))))
                .post("/console/support-tickets")
                .then()
                .statusCode(422)
                .body("code", equalTo("attachment_not_found"));
    }

    @Test
    void attachmentsAreRecognizedByTheirBytesAndStayInTheirAccount() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Adjuntos SAS");
        owner.request()
                .body(new UploadAttachmentRequest(
                        "factura.png", base64("<script>no</script>".getBytes(StandardCharsets.UTF_8))))
                .post("/console/support-attachments")
                .then()
                .statusCode(422)
                .body("code", equalTo("attachment_type_unsupported"));
        owner.request()
                .body(new UploadAttachmentRequest("../../etc/passwd", base64(PNG)))
                .post("/console/support-attachments")
                .then()
                .statusCode(400);

        // The largest file fits in one request; a byte more is refused.
        upload(owner, "grande.png", Arrays.copyOf(PNG, HelpViews.MAX_ATTACHMENT_BYTES));
        owner.request()
                .body(new UploadAttachmentRequest(
                        "enorme.png", base64(Arrays.copyOf(PNG, HelpViews.MAX_ATTACHMENT_BYTES + 1))))
                .post("/console/support-attachments")
                .then()
                .statusCode(422)
                .body("code", equalTo("attachment_too_large"));

        ConsoleUser other = ConsoleUser.newOrganization();
        bootstrap(other, "Ajena SAS");
        String foreign = upload(other, "ajena.png", PNG);
        owner.request()
                .body(request(List.of(UUID.fromString(foreign))))
                .post("/console/support-tickets")
                .then()
                .statusCode(422)
                .body("code", equalTo("attachment_not_found"));
        owner.request()
                .body(new CreateTicketRequest("Hola", Priority.LOW, UUID.randomUUID(), null, null, List.of()))
                .post("/console/support-tickets")
                .then()
                .statusCode(404);
    }

    @Test
    void aPersonOpensAFewTicketsAnHour() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Insistente SAS");
        for (int i = 0; i < SupportTickets.TICKETS_PER_WINDOW; i++) {
            owner.request()
                    .body(request(List.of()))
                    .post("/console/support-tickets")
                    .then()
                    .statusCode(201);
        }
        owner.request()
                .body(request(List.of()))
                .post("/console/support-tickets")
                .then()
                .statusCode(429)
                .header("Retry-After", equalTo("600"))
                .body("code", equalTo("support_too_many"));
        // Each person has their own share.
        owner.member("member")
                .request()
                .body(request(List.of()))
                .post("/console/support-tickets")
                .then()
                .statusCode(201);
    }

    @Test
    void anAccountUploadsAFewDozenFilesAnHour() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Archivos SAS");
        for (int i = 0; i < SupportTickets.ATTACHMENTS_PER_WINDOW; i++) {
            upload(owner, "captura-" + i + ".png", PNG);
        }
        owner.request()
                .body(new UploadAttachmentRequest("otra.png", base64(PNG)))
                .post("/console/support-attachments")
                .then()
                .statusCode(429)
                .body("code", equalTo("support_too_many"));
    }

    @Test
    void aSuspendedAccountCanStillAskForHelpButNotWhileImpersonated() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        String accountId = bootstrap(owner, "Suspendida Ayuda SAS");
        ADMIN.request()
                .body(Map.of("reason", "Pago vencido"))
                .post("/admin/accounts/" + accountId + "/suspension")
                .then()
                .statusCode(200);

        String attachmentId = upload(owner, "error.png", PNG);
        owner.request()
                .body(request(List.of(UUID.fromString(attachmentId))))
                .post("/console/support-tickets")
                .then()
                .statusCode(201);
        owner.request()
                .body(new FeedbackRequest("Me gustaría exportar a Excel", "/documents"))
                .post("/console/feedback")
                .then()
                .statusCode(204);
        FeedbackEntity feedback = QuarkusTransaction.requiringNew()
                .call(() -> FeedbackEntity.<FeedbackEntity>find("userId", owner.userId())
                        .singleResult());
        assertThat(feedback.message).isEqualTo("Me gustaría exportar a Excel");
        assertThat(jobs(JobTypes.SEND_FEEDBACK, feedback.id.toString())).isEqualTo(1);

        for (String path : List.of("/console/support-tickets", "/console/feedback")) {
            owner.impersonatedBy(ADMIN.userId())
                    .body(path.endsWith("feedback") ? new FeedbackRequest("Idea", null) : request(List.of()))
                    .post(path)
                    .then()
                    .statusCode(403)
                    .body("code", equalTo("impersonation_forbidden"));
        }
    }

    @Test
    void theTeamMovesATicketAlongAndTheCustomerSeesIt() {
        ConsoleUser owner = ConsoleUser.newOrganization();
        bootstrap(owner, "Seguimiento SAS");
        String ticketId = owner.request()
                .body(request(List.of()))
                .post("/console/support-tickets")
                .then()
                .statusCode(201)
                .extract()
                .path("id");

        owner.request().get("/admin/support-tickets").then().statusCode(403);
        SUPPORT.request()
                .get("/admin/support-tickets?status=OPEN&limit=100")
                .then()
                .statusCode(200)
                .body("items.find { it.id == '%s' }.accountName".formatted(ticketId), equalTo("Seguimiento SAS"));

        SUPPORT.request()
                .body(new ChangeTicketStatusRequest(Status.RESOLVED))
                .put("/admin/support-tickets/" + ticketId + "/status")
                .then()
                .statusCode(200)
                .body("status", equalTo("RESOLVED"));
        owner.request().get("/console/support-tickets").then().body("items[0].status", equalTo("RESOLVED"));
        owner.request()
                .get("/console/audit-log?action=SUPPORT_TICKET_STATUS_CHANGED")
                .then()
                .body("items", hasSize(1))
                .body("items[0].actorType", equalTo("PLATFORM"))
                .body("items[0].data.status", equalTo("RESOLVED"))
                .body("items[0].data.statusPrevious", equalTo("OPEN"));
    }

    private static CreateTicketRequest request(List<UUID> attachmentIds) {
        return new CreateTicketRequest(
                "No puedo emitir", Priority.CRITICAL, null, Environment.SANDBOX, "/documents", attachmentIds);
    }

    private static String upload(ConsoleUser user, String fileName, byte[] content) {
        return user.request()
                .body(new UploadAttachmentRequest(fileName, base64(content)))
                .post("/console/support-attachments")
                .then()
                .statusCode(201)
                .body("size", equalTo(content.length))
                .extract()
                .path("id");
    }

    private static String base64(byte[] content) {
        return Base64.getEncoder().encodeToString(content);
    }

    private static long jobs(String type, String referenceId) {
        return QuarkusTransaction.requiringNew()
                .call(() -> JobEntity.count("jobType = ?1 and referenceId = ?2", type, UUID.fromString(referenceId)));
    }
}
