package com.cantte.cetus.worker.handlers;

import com.cantte.cetus.domain.dian.Hashing;
import com.cantte.cetus.notifications.NotificationKind;
import com.cantte.cetus.notifications.Notifications;
import com.cantte.cetus.persistence.entity.AccountContactEntity;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.NotificationEntity;
import com.cantte.cetus.worker.runner.GiveUp;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.FakeResend;
import com.cantte.cetus.worker.support.FakeResend.Reply;
import com.cantte.cetus.worker.support.FakeResendResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
@QuarkusTestResource(FakeResendResource.class)
class SendNotificationHandlerTest {

    private static final Pattern LINK = Pattern.compile("/contact-verification/([A-Za-z0-9_-]{43})");

    @Inject
    SendNotificationHandler handler;
    @Inject
    Notifications notifications;
    @Inject
    WorkerFixtures fixtures;
    @Inject
    FakeResend resend;

    @BeforeEach
    void reset() {
        resend.reset();
    }

    @Test
    void aNoticeGoesToEachVerifiedAddressOfItsCategoriesOnce() {
        UUID accountId = account();
        fixtures.contacts(accountId, "same@cetus.test", "same@cetus.test", "billing@cetus.test");
        UUID id = request(accountId, NotificationKind.REJECTIONS_SPIKE, Map.of("date", "22/10/2026", "rejected", "5",
                "total", "8", "rate", "63"));

        handler.handle(fixtures.notificationJob(id));
        // A retry of a sent notice does nothing.
        handler.handle(fixtures.notificationJob(id));

        assertThat(resend.requests()).singleElement().satisfies(request -> {
            assertThat(request.body().get("to").get(0).asText()).isEqualTo("same@cetus.test");
            assertThat(request.idempotencyKey()).isEqualTo("notification-" + id + "-same@cetus.test");
            assertThat(request.body().get("html").asText()).contains("5 de los 8 documentos");
        });
        NotificationEntity sent = notice(id);
        assertThat(sent.status).isEqualTo(NotificationEntity.Status.SENT);
        assertThat(sent.recipients).containsExactly("same@cetus.test");
    }

    @Test
    void aRetryAfterAPartialFailureReusesTheKeysOfTheEmailsAlreadySent() {
        UUID accountId = account();
        fixtures.contacts(accountId, "a-tech@cetus.test", "b-fiscal@cetus.test", "billing@cetus.test");
        UUID id = request(accountId, NotificationKind.REJECTIONS_SPIKE, Map.of("date", "22/10/2026", "rejected", "5",
                "total", "8", "rate", "63"));
        // The first address gets its email; Resend fails on the second.
        resend.reply(new Reply(200, "{\"id\":\"email-1\"}"),
                Reply.error(500, "internal_server_error", "Resend is down"));

        assertThat(catchThrowable(() -> handler.handle(fixtures.notificationJob(id)))).isNotNull();
        assertThat(notice(id).status).isEqualTo(NotificationEntity.Status.PENDING);

        handler.handle(fixtures.notificationJob(id));

        var requests = resend.requests();
        assertThat(requests).extracting(request -> request.body().get("to").get(0).asText())
                .containsExactly("a-tech@cetus.test", "b-fiscal@cetus.test", "a-tech@cetus.test", "b-fiscal@cetus.test");
        // Resend answers a repeated key with the email it already sent instead of sending it again.
        assertThat(requests.get(2).idempotencyKey()).isEqualTo(requests.get(0).idempotencyKey());
        assertThat(requests.get(3).idempotencyKey()).isEqualTo(requests.get(1).idempotencyKey());
        NotificationEntity sent = notice(id);
        assertThat(sent.status).isEqualTo(NotificationEntity.Status.SENT);
        assertThat(sent.recipients).containsExactly("a-tech@cetus.test", "b-fiscal@cetus.test");
    }

    @Test
    void withoutAContactTheNoticeIsSkipped() {
        UUID accountId = account();
        fixtures.contacts(accountId, "tech@cetus.test", null, null);
        UUID id = request(accountId, NotificationKind.ACCOUNT_SUSPENDED, Map.of("reason", "Pago vencido"));

        handler.handle(fixtures.notificationJob(id));

        assertThat(resend.requests()).isEmpty();
        assertThat(notice(id).status).isEqualTo(NotificationEntity.Status.SKIPPED);
        assertThat(notice(id).error).isEqualTo("no_contact");
    }

    @Test
    void aRejectedEmailFailsTheNotice() {
        UUID accountId = account();
        fixtures.contacts(accountId, null, null, "billing@cetus.test");
        UUID id = request(accountId, NotificationKind.ACCOUNT_SUSPENDED, Map.of("reason", "Pago vencido"));
        resend.reply(Reply.error(422, "validation_error", "Invalid `to` field"));

        catchThrowableOfType(GiveUp.class, () -> handler.handle(fixtures.notificationJob(id)));

        assertThat(notice(id).status).isEqualTo(NotificationEntity.Status.FAILED);
    }

    @Test
    void aVerificationGoesToTheNewAddressWithALinkWhoseHashIsKept() {
        UUID accountId = account();
        fixtures.contacts(accountId, "tech@cetus.test", "fiscal@cetus.test", "billing@cetus.test");
        OffsetDateTime requestedAt = pending(accountId, "new@cetus.test");
        // One link can verify several categories, as the owner's address when the account is created.
        UUID id = verification(accountId, "new@cetus.test", requestedAt, "TECHNICAL,FISCAL,BILLING");

        handler.handle(fixtures.notificationJob(id));

        assertThat(resend.requests()).singleElement().satisfies(request -> {
            assertThat(request.body().get("to").get(0).asText()).isEqualTo("new@cetus.test");
            assertThat(request.body().get("text").asText())
                    .contains("los avisos técnicos (webhooks y errores de integración), fiscales (")
                    .contains(" y de facturación (plan y pagos) de Cetus");
            Matcher link = LINK.matcher(request.body().get("text").asText());
            assertThat(link.find()).isTrue();
            AccountContactEntity contact = contact(accountId);
            assertThat(contact.pendingTokenHash)
                    .isEqualTo(Hashing.sha256Hex(link.group(1).getBytes(StandardCharsets.UTF_8)));
            assertThat(contact.pendingExpiresAt).isAfter(OffsetDateTime.now().plusHours(47));
            assertThat(contact.email).isEqualTo("fiscal@cetus.test");
        });
    }

    @Test
    void aSharedVerificationGoesOnWhenTheCategoryItNamesLeftTheRequest() {
        UUID accountId = account();
        fixtures.contacts(accountId, "tech@cetus.test", "fiscal@cetus.test", "billing@cetus.test");
        // The three categories wait for the owner's address since the same request, as on signing up.
        OffsetDateTime requestedAt = OffsetDateTime.now().truncatedTo(ChronoUnit.MILLIS);
        QuarkusTransaction.requiringNew().run(() -> AccountContactEntity.update(
                "pendingEmail = ?1, pendingRequestedAt = ?2 where accountId = ?3", "owner@cetus.test", requestedAt,
                accountId));
        UUID id = verification(accountId, "owner@cetus.test", requestedAt, "TECHNICAL,FISCAL,BILLING");
        // The category the notice names (FISCAL) moved to another address before the email went out.
        pending(accountId, "other@cetus.test");

        handler.handle(fixtures.notificationJob(id));

        assertThat(resend.requests()).singleElement().satisfies(request ->
                assertThat(request.body().get("to").get(0).asText()).isEqualTo("owner@cetus.test"));
        List<AccountContactEntity> contacts = QuarkusTransaction.requiringNew().call(() ->
                AccountContactEntity.<AccountContactEntity>list("accountId", accountId));
        assertThat(contacts).filteredOn(contact -> contact.pendingTokenHash != null)
                .singleElement().satisfies(contact -> assertThat(contact.category)
                        .isEqualTo(AccountContactEntity.Category.TECHNICAL));
    }

    @Test
    void aVerificationOfAChangeThatWasReplacedIsSkipped() {
        UUID accountId = account();
        fixtures.contacts(accountId, "tech@cetus.test", "fiscal@cetus.test", "billing@cetus.test");
        OffsetDateTime first = pending(accountId, "first@cetus.test");
        UUID stale = verification(accountId, "first@cetus.test", first);
        pending(accountId, "second@cetus.test");

        handler.handle(fixtures.notificationJob(stale));

        assertThat(resend.requests()).isEmpty();
        assertThat(notice(stale).status).isEqualTo(NotificationEntity.Status.SKIPPED);
        assertThat(contact(accountId).pendingTokenHash).isNull();
    }

    private UUID account() {
        UUID documentId = fixtures.invoice();
        return QuarkusTransaction.requiringNew().call(() -> DocumentEntity.<DocumentEntity>findById(documentId).accountId);
    }

    private UUID request(UUID accountId, NotificationKind kind, Map<String, String> data) {
        return QuarkusTransaction.requiringNew().call(() ->
                notifications.request(accountId, kind, kind + ":" + UUID.randomUUID(), data).orElseThrow());
    }

    /** What the console does: the FISCAL contact asks to move to {@code email}. */
    private static OffsetDateTime pending(UUID accountId, String email) {
        OffsetDateTime requestedAt = OffsetDateTime.now().truncatedTo(ChronoUnit.MILLIS);
        QuarkusTransaction.requiringNew().run(() -> AccountContactEntity.update(
                "pendingEmail = ?1, pendingRequestedAt = ?2, pendingTokenHash = null where accountId = ?3 and category = ?4",
                email, requestedAt, accountId, AccountContactEntity.Category.FISCAL));
        return requestedAt;
    }

    private UUID verification(UUID accountId, String email, OffsetDateTime requestedAt) {
        return verification(accountId, email, requestedAt, "FISCAL");
    }

    private UUID verification(UUID accountId, String email, OffsetDateTime requestedAt, String categories) {
        return request(accountId, NotificationKind.CONTACT_VERIFICATION, Map.of(
                "contactId", contact(accountId).id.toString(), "categories", categories, "email", email,
                "requestedAt", requestedAt.toInstant().toString()));
    }

    private static AccountContactEntity contact(UUID accountId) {
        return QuarkusTransaction.requiringNew().call(() -> AccountContactEntity.<AccountContactEntity>find(
                "accountId = ?1 and category = ?2", accountId, AccountContactEntity.Category.FISCAL).singleResult());
    }

    private static NotificationEntity notice(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> NotificationEntity.findById(id));
    }
}
