package com.cantte.cetus.worker.handlers;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.Ids;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity;
import com.cantte.cetus.persistence.entity.DocumentDeliveryEntity.Status;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.worker.support.FakeDian;
import com.cantte.cetus.worker.support.FakeDian.Reply;
import com.cantte.cetus.worker.support.FakeDianResource;
import com.cantte.cetus.worker.support.FakeResend;
import com.cantte.cetus.worker.support.FakeResendResource;
import com.cantte.cetus.worker.support.WorkerFixtures;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Accepted documents emailed again from the console, through the delivery it created. */
@QuarkusTest
@QuarkusTestResource(FakeDianResource.class)
@QuarkusTestResource(FakeResendResource.class)
class ResendDocumentHandlerTest {

    @Inject
    ProcessDocumentHandler processor;

    @Inject
    DeliverDocumentHandler delivery;

    @Inject
    ResendDocumentHandler handler;

    @Inject
    FakeDian dian;

    @Inject
    FakeResend resend;

    @Inject
    WorkerFixtures fixtures;

    @BeforeEach
    void reset() {
        dian.reset();
        resend.reset();
    }

    @Test
    void goesToTheAddressAskedForWithItsOwnKey() {
        UUID id = deliveredInvoice();
        UUID deliveryId = pendingResend(id, "contabilidad@cliente.test");

        handler.handle(fixtures.job(deliveryId, 1));

        DocumentDeliveryEntity sent = delivery(deliveryId);
        assertThat(sent.status).isEqualTo(Status.SENT);
        assertThat(sent.recipient).isEqualTo("contabilidad@cliente.test");
        assertThat(sent.attempts).isEqualTo(1);
        assertThat(resend.requests()).hasSize(2);
        FakeResend.Request request = resend.requests().get(1);
        assertThat(request.idempotencyKey()).isEqualTo("delivery-" + deliveryId);
        assertThat(request.body().get("to").get(0).asText()).isEqualTo("contabilidad@cliente.test");
        assertThat(request.body().get("attachments")).hasSize(1);
    }

    @Test
    void withoutAnAddressGoesWhereTheFirstDeliveryWent() {
        UUID id = deliveredInvoice();
        UUID deliveryId = pendingResend(id, null);

        handler.handle(fixtures.job(deliveryId, 1));

        assertThat(delivery(deliveryId).recipient).isEqualTo(FakeResendResource.TEST_RECIPIENT);
        assertThat(resend.requests())
                .extracting(r -> r.body().get("to").get(0).asText())
                .containsExactly(FakeResendResource.TEST_RECIPIENT, FakeResendResource.TEST_RECIPIENT);
    }

    @Test
    void aResolvedDeliveryIsNotSentAgain() {
        UUID id = deliveredInvoice();
        UUID deliveryId = pendingResend(id, "contabilidad@cliente.test");
        handler.handle(fixtures.job(deliveryId, 1));

        handler.handle(fixtures.job(deliveryId, 2));

        assertThat(resend.requests()).hasSize(2);
    }

    @Test
    void everySandboxResendTakesAnEmailSlot() {
        // The test profile allows two SANDBOX emails a day per account.
        UUID id = fixtures.sandboxInvoice("900108281");
        UUID accountId =
                QuarkusTransaction.requiringNew().call(() -> DocumentEntity.<DocumentEntity>findById(id).accountId);
        fixtures.contacts(accountId, "dev@cliente.test", null, null);
        processor.handle(fixtures.job(id, 1));
        delivery.handle(fixtures.job(id, 1));

        UUID second = pendingResend(id, null);
        handler.handle(fixtures.job(second, 1));
        UUID third = pendingResend(id, null);
        handler.handle(fixtures.job(third, 1));

        assertThat(delivery(second).status).isEqualTo(Status.SENT);
        assertThat(delivery(second).recipient).isEqualTo("dev@cliente.test");
        assertThat(delivery(third).status).isEqualTo(Status.SKIPPED);
        assertThat(delivery(third).error).contains("2 SANDBOX emails of the day");
    }

    private UUID deliveredInvoice() {
        dian.reply("SendBillSync", Reply.fixture("send-bill-sync-accepted.xml"));
        UUID id = fixtures.invoice();
        processor.handle(fixtures.job(id, 1));
        delivery.handle(fixtures.job(id, 1));
        assertThat(deliveries(id))
                .singleElement()
                .satisfies(d -> assertThat(d.status).isEqualTo(Status.SENT));
        return id;
    }

    /** The delivery the console leaves when asked to email the document again. */
    private static UUID pendingResend(UUID documentId, String recipient) {
        return QuarkusTransaction.requiringNew().call(() -> {
            DocumentDeliveryEntity created = new DocumentDeliveryEntity();
            created.id = Ids.newId();
            created.documentId = documentId;
            created.recipient = recipient;
            created.persist();
            return created.id;
        });
    }

    private static DocumentDeliveryEntity delivery(UUID deliveryId) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentDeliveryEntity.findById(deliveryId));
    }

    private static List<DocumentDeliveryEntity> deliveries(UUID id) {
        return QuarkusTransaction.requiringNew().call(() -> DocumentDeliveryEntity.listByDocument(id));
    }
}
