package com.cantte.cetus.payments;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import com.cantte.cetus.payments.EventCheck.Invalid;
import com.cantte.cetus.payments.EventCheck.OtherEnvironment;
import com.cantte.cetus.payments.EventCheck.Verified;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Signatures checked against the examples in Wompi's documentation, and the client against a local server. */
class WompiGatewayTest {

    /** The secrets of Wompi's documented examples. */
    private static final WompiKeys DOCS_KEYS = new WompiKeys(
            "pub_prod_example",
            "prv_prod_example",
            "prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6",
            "prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z");

    private static final ObjectMapper JSON =
            new ObjectMapper().setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);

    record Transaction(
            String id,
            String reference,
            String status,
            long amountInCents,
            String currency,
            String paymentMethodType,
            String statusMessage,
            String createdAt,
            String finalizedAt) {}

    record Envelope(Object data) {}

    record ErrorBody(Error error) {
        record Error(String type, String reason) {}
    }

    record Signature(List<String> properties, String checksum) {}

    record Event(String event, Object data, String environment, Signature signature, long timestamp) {}

    record Exchange(String path, String authorization) {}

    private HttpServer server;
    private final AtomicReference<Exchange> last = new AtomicReference<>();
    private volatile int status = 200;
    private volatile Object responseBody;

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            last.set(new Exchange(
                    exchange.getRequestURI().getRawPath()
                            + (exchange.getRequestURI().getRawQuery() == null
                                    ? ""
                                    : "?" + exchange.getRequestURI().getRawQuery()),
                    exchange.getRequestHeaders().getFirst("Authorization")));
            byte[] response = JSON.writeValueAsBytes(responseBody);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    @Test
    void theIntegritySignatureMatchesTheDocumentedExample() {
        assertThat(WompiGateway.sha256(
                        "sk8-438k4-xmxm392-sn2m2490000COPprod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6"))
                .isEqualTo("37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5");
    }

    @Test
    void aCheckoutSignsTheExpirationAsItIsSent() {
        Checkout checkout = gateway(DOCS_KEYS)
                .checkout(new CheckoutRequest(
                        "CET-1",
                        4_950_000,
                        "COP",
                        Instant.parse("2023-06-09T20:28:50Z"),
                        URI.create("https://console.example.com/orders/1")));

        assertThat(checkout.expirationTime()).isEqualTo("2023-06-09T20:28:50.000Z");
        assertThat(checkout.signature())
                .isEqualTo(WompiGateway.sha256(
                        "CET-14950000COP2023-06-09T20:28:50.000Z" + "prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6"));
        assertThat(checkout.publicKey()).isEqualTo("pub_prod_example");
        assertThat(checkout.link().toString())
                .startsWith("https://checkout.wompi.co/p/?public-key=pub_prod_example&currency=COP")
                .contains("amount-in-cents=4950000")
                .contains("signature%3Aintegrity=" + checkout.signature())
                .contains("expiration-time=2023-06-09T20%3A28%3A50.000Z")
                .contains("redirect-url=https%3A%2F%2Fconsole.example.com%2Forders%2F1");
    }

    @Test
    void theDocumentedEventIsVerified() throws IOException {
        EventCheck check = gateway(DOCS_KEYS).verifyEvent(documentedEvent("prod", documentedChecksum()));

        assertThat(check)
                .isEqualTo(new Verified(new PaymentEvent(
                        "transaction.updated:1234-1610641025-49201:APPROVED:4490000",
                        "transaction.updated",
                        Optional.of("1234-1610641025-49201"))));
    }

    @Test
    void theChecksumIsComparedWithoutCase() throws IOException {
        EventCheck check = gateway(DOCS_KEYS)
                .verifyEvent(documentedEvent("prod", documentedChecksum().toLowerCase()));

        assertThat(check).isInstanceOf(Verified.class);
    }

    @Test
    void aForgedEventIsInvalid() throws IOException {
        String forged = JSON.writeValueAsString(new Event(
                "transaction.updated",
                Map.of(
                        "transaction",
                        Map.of("id", "1234-1610641025-49201", "status", "APPROVED", "amount_in_cents", 1)),
                "prod",
                new Signature(
                        List.of("transaction.id", "transaction.status", "transaction.amount_in_cents"),
                        documentedChecksum()),
                1530291411));

        assertThat(gateway(DOCS_KEYS).verifyEvent(forged)).isEqualTo(new Invalid("checksum mismatch"));
        assertThat(gateway(DOCS_KEYS).verifyEvent("not json")).isInstanceOf(Invalid.class);
        assertThat(gateway(DOCS_KEYS).verifyEvent("[]")).isInstanceOf(Invalid.class);
    }

    @Test
    void anEventOfTheOtherEnvironmentIsSetApart() throws IOException {
        WompiKeys sandbox =
                new WompiKeys("pub_test_example", "prv_test_example", "test_integrity_example", "test_events_secret");
        Event event = new Event(
                "transaction.updated",
                Map.of("transaction", Map.of("id", "1-2-3", "status", "APPROVED")),
                "prod",
                new Signature(
                        List.of("transaction.id", "transaction.status"),
                        WompiGateway.sha256("1-2-3APPROVED1530291411test_events_secret")),
                1530291411);

        assertThat(gateway(sandbox).verifyEvent(JSON.writeValueAsString(event)))
                .isEqualTo(new OtherEnvironment("prod"));
    }

    @Test
    void readsATransactionWithThePrivateKey() throws IOException {
        responseBody = new Envelope(new Transaction(
                "1292-1602113476-10985",
                "CET-1",
                "APPROVED",
                4_950_000,
                "COP",
                "CARD",
                "Transacción aprobada",
                "2026-10-30T15:00:00.000Z",
                "2026-10-30T15:00:05.000Z"));

        PaymentTransaction transaction =
                gateway(DOCS_KEYS).transaction("1292-1602113476-10985").orElseThrow();

        assertThat(last.get())
                .isEqualTo(new Exchange("/v1/transactions/1292-1602113476-10985", "Bearer prv_prod_example"));
        assertThat(transaction.status()).isEqualTo(PaymentStatus.APPROVED);
        assertThat(transaction.reference()).isEqualTo("CET-1");
        assertThat(transaction.amountCents()).isEqualTo(4_950_000);
        assertThat(transaction.paymentMethodType()).isEqualTo("CARD");
        assertThat(transaction.statusMessage()).contains("Transacción aprobada");
        assertThat(transaction.finalizedAt()).contains(Instant.parse("2026-10-30T15:00:05Z"));
        assertThat(JSON.readValue(transaction.raw(), Transaction.class).reference())
                .isEqualTo("CET-1");
    }

    @Test
    void aPendingTransactionHasNoFinalizationYet() {
        responseBody = new Envelope(new Transaction(
                "1-2-3", "CET-1", "PENDING", 100, "COP", "PSE", null, "2026-10-30T15:00:00.000Z", null));

        PaymentTransaction transaction = gateway(DOCS_KEYS).transaction("1-2-3").orElseThrow();

        assertThat(transaction.status().isFinal()).isFalse();
        assertThat(transaction.finalizedAt()).isEmpty();
        assertThat(transaction.statusMessage()).isEmpty();
    }

    @Test
    void searchesTheTransactionsOfAReference() {
        responseBody = new Envelope(List.of(
                new Transaction(
                        "1-2-3", "CET-1", "DECLINED", 100, "COP", "CARD", null, "2026-10-30T15:00:00.000Z", null),
                new Transaction(
                        "1-2-4",
                        "CET-1",
                        "APPROVED",
                        100,
                        "COP",
                        "CARD",
                        null,
                        "2026-10-30T15:01:00.000Z",
                        "2026-10-30T15:01:04.000Z")));

        List<PaymentTransaction> transactions = gateway(DOCS_KEYS).transactions("CET 1");

        assertThat(last.get()).isEqualTo(new Exchange("/v1/transactions?reference=CET+1", "Bearer prv_prod_example"));
        assertThat(transactions)
                .extracting(PaymentTransaction::id, PaymentTransaction::status)
                .containsExactly(tuple("1-2-3", PaymentStatus.DECLINED), tuple("1-2-4", PaymentStatus.APPROVED));
    }

    @Test
    void anUnknownTransactionIsEmpty() {
        respond(404, new ErrorBody(new ErrorBody.Error("NOT_FOUND_ERROR", "La entidad solicitada no existe")));

        assertThat(gateway(DOCS_KEYS).transaction("missing")).isEmpty();
    }

    @Test
    void aServerErrorOrARateLimitIsTransient() {
        respond(503, new ErrorBody(new ErrorBody.Error("SERVICE_UNAVAILABLE", "down")));
        assertThatThrownBy(() -> gateway(DOCS_KEYS).transaction("1-2-3"))
                .isInstanceOf(PaymentTransientException.class)
                .hasMessageContaining("SERVICE_UNAVAILABLE");

        respond(429, new ErrorBody(new ErrorBody.Error("TOO_MANY_REQUESTS", "slow down")));
        assertThatThrownBy(() -> gateway(DOCS_KEYS).transaction("1-2-3")).isInstanceOf(PaymentTransientException.class);
    }

    @Test
    void aWrongKeyIsRejected() {
        respond(
                401,
                new ErrorBody(new ErrorBody.Error(
                        "INVALID_ACCESS_TOKEN", "La llave proporcionada no corresponde a este ambiente.")));

        assertThatThrownBy(() -> gateway(DOCS_KEYS).transaction("1-2-3"))
                .isInstanceOf(PaymentRejectedException.class)
                .hasMessageContaining("INVALID_ACCESS_TOKEN");
    }

    @Test
    void anUnknownStatusIsRejected() {
        responseBody = new Envelope(new Transaction(
                "1-2-3", "CET-1", "SETTLED", 100, "COP", "CARD", null, "2026-10-30T15:00:00.000Z", null));

        assertThatThrownBy(() -> gateway(DOCS_KEYS).transaction("1-2-3")).isInstanceOf(PaymentRejectedException.class);
    }

    @Test
    void anUnreachableWompiIsTransient() {
        server.stop(0);

        assertThatThrownBy(() -> gateway(DOCS_KEYS).transaction("1-2-3")).isInstanceOf(PaymentTransientException.class);
    }

    @Test
    void keysOfDifferentEnvironmentsAreRefused() {
        assertThatThrownBy(() -> new WompiKeys("pub_test_a", "prv_prod_b", "test_integrity_c", "test_events_d"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageNotContaining("prv_prod_b");
        assertThatThrownBy(() -> new WompiKeys("pk_a", "prv_test_b", "test_integrity_c", "test_events_d"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(new WompiKeys("pub_test_a", "prv_test_b", "test_integrity_c", "test_events_d").environment())
                .isEqualTo(WompiKeys.Environment.SANDBOX);
        assertThat(DOCS_KEYS.toString()).doesNotContain("prod_events_");
    }

    private WompiGateway gateway(WompiKeys keys) {
        return new WompiGateway(
                keys,
                URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/v1"),
                Duration.ofSeconds(2),
                Duration.ofSeconds(2));
    }

    private void respond(int status, Object body) {
        this.status = status;
        this.responseBody = body;
    }

    /**
     * SHA-256 of the documented concatenation (step 3 of the example). The checksum printed next to it,
     * 3476DDA5..., is not the hash of that text, so the example cannot be checked literally.
     */
    private static String documentedChecksum() {
        return "5A18EC5E8FDB7DF463E9F94774CBA8F583BA21BD04A09CEFF2EA68A4BC0AEFBE";
    }

    /** The event of the documentation, as Wompi sends it. */
    private static String documentedEvent(String environment, String checksum) throws IOException {
        return JSON.writeValueAsString(new Event(
                "transaction.updated",
                Map.of(
                        "transaction",
                        Map.of(
                                "id", "1234-1610641025-49201",
                                "amount_in_cents", 4490000,
                                "reference", "MZQ3X2DE2SMX",
                                "currency", "COP",
                                "payment_method_type", "NEQUI",
                                "status", "APPROVED")),
                environment,
                new Signature(List.of("transaction.id", "transaction.status", "transaction.amount_in_cents"), checksum),
                1530291411));
    }
}
