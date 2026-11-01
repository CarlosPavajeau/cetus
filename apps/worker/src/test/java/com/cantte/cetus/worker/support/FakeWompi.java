package com.cantte.cetus.worker.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Wompi API stand-in for worker tests: answers GET /v1/transactions/{id} and GET /v1/transactions?reference=
 * from the transactions a test puts, takes charges to saved sources (POST /v1/transactions, PENDING until a test
 * puts their outcome, a reference once), takes refunds (POST /v1/refunds, decided as {@link #refunding(String)}
 * says), serves the terms in force (GET /v1/merchants/info), and answers 503 while {@link #down(boolean)}. Only the
 * private key is accepted.
 */
@ApplicationScoped
public class FakeWompi {

    private static final ObjectMapper JSON =
            new ObjectMapper().setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);

    /** A transaction as Wompi serializes it. */
    public record Transaction(
            String id,
            String reference,
            String status,
            long amountInCents,
            String currency,
            String paymentMethodType,
            String statusMessage,
            String createdAt,
            String finalizedAt) {

        public static Transaction of(String id, String reference, String status, long amountInCents) {
            Instant now = Instant.now();
            return new Transaction(
                    id,
                    reference,
                    status,
                    amountInCents,
                    "COP",
                    "CARD",
                    null,
                    now.toString(),
                    "PENDING".equals(status) ? null : now.toString());
        }
    }

    /** The charge to a saved source as the worker sends it. */
    public record Charge(
            long amountInCents,
            String currency,
            String signature,
            String customerEmail,
            String reference,
            long paymentSourceId,
            Map<String, Object> paymentMethod,
            boolean recurrent,
            String acceptanceToken,
            String acceptPersonalAuth) {}

    /** A refund as the worker asks for it. */
    public record RefundAsked(long amountInCents, String transactionId, String reason, String reference) {}

    private record RefundBody(
            long id,
            String status,
            String statusMessage,
            String v2RefundId,
            long amountInCents,
            String transactionId,
            String reference) {}

    private record Presigned(String acceptanceToken, String permalink, String type) {}

    private record Merchant(Presigned presignedAcceptance, Presigned presignedPersonalDataAuth) {}

    private record Envelope(Object data) {}

    private record ErrorBody(Error error) {
        private record Error(String type, String reason) {}
    }

    @ConfigProperty(name = "fake-wompi.port")
    int port;

    private final Map<String, Transaction> transactions = new ConcurrentHashMap<>();
    private final AtomicInteger requests = new AtomicInteger();
    private final List<Charge> charges = new CopyOnWriteArrayList<>();
    private final List<RefundAsked> refunds = new CopyOnWriteArrayList<>();
    private volatile String refundStatus = "APPROVED";
    private volatile boolean down;
    private volatile boolean refusing;
    private volatile boolean garbling;
    private HttpServer server;

    @PostConstruct
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", port), 0);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        server.createContext("/v1/transactions", this::handle);
        server.createContext("/v1/refunds", this::refund);
        server.createContext(
                "/v1/merchants/info",
                exchange -> reply(
                        exchange,
                        200,
                        new Envelope(new Merchant(
                                new Presigned("eyJ.policy", "https://wompi.com/terminos.pdf", "END_USER_POLICY"),
                                new Presigned("eyJ.data", "https://wompi.com/datos.pdf", "PERSONAL_DATA_AUTH")))));
        server.start();
    }

    @PreDestroy
    void stop() {
        server.stop(0);
    }

    public void put(Transaction transaction) {
        transactions.put(transaction.id(), transaction);
    }

    public void down(boolean value) {
        down = value;
    }

    /** Every charge refused with a validation error, as Wompi answers an unknown source. */
    public void refusing(boolean value) {
        refusing = value;
    }

    /** Every charge made, but answered with what cannot be read, as when its answer is lost. */
    public void garbling(boolean value) {
        garbling = value;
    }

    /** How Wompi decides the refunds asked from now on: APPROVED (the default), DECLINED, PENDING… */
    public void refunding(String status) {
        refundStatus = status;
    }

    /** The refunds asked, the first first. */
    public List<RefundAsked> refunds() {
        return List.copyOf(refunds);
    }

    public int requests() {
        return requests.get();
    }

    /** The charges made, the first first. */
    public List<Charge> charges() {
        return List.copyOf(charges);
    }

    public void reset() {
        transactions.clear();
        charges.clear();
        refunds.clear();
        refundStatus = "APPROVED";
        requests.set(0);
        down = false;
        refusing = false;
        garbling = false;
    }

    private void handle(HttpExchange exchange) throws IOException {
        requests.incrementAndGet();
        if (down) {
            reply(exchange, 503, new ErrorBody(new ErrorBody.Error("SERVICE_UNAVAILABLE", "down")));
            return;
        }
        if (!("Bearer " + FakeWompiResource.PRIVATE_KEY)
                .equals(exchange.getRequestHeaders().getFirst("Authorization"))) {
            reply(
                    exchange,
                    404,
                    new ErrorBody(new ErrorBody.Error("NOT_FOUND_ERROR", "La entidad solicitada no existe")));
            return;
        }
        String path = exchange.getRequestURI().getPath();
        String query = exchange.getRequestURI().getRawQuery();
        if (exchange.getRequestMethod().equals("POST") && path.equals("/v1/transactions")) {
            charge(exchange);
            return;
        }
        if (path.equals("/v1/transactions") && query != null && query.startsWith("reference=")) {
            String reference = URLDecoder.decode(query.substring("reference=".length()), StandardCharsets.UTF_8);
            List<Transaction> found = transactions.values().stream()
                    .filter(transaction -> transaction.reference().equals(reference))
                    .toList();
            reply(exchange, 200, new Envelope(found));
            return;
        }
        Transaction transaction = transactions.get(path.substring("/v1/transactions/".length()));
        if (transaction == null) {
            reply(
                    exchange,
                    404,
                    new ErrorBody(new ErrorBody.Error("NOT_FOUND_ERROR", "La entidad solicitada no existe")));
            return;
        }
        reply(exchange, 200, new Envelope(transaction));
    }

    private void charge(HttpExchange exchange) throws IOException {
        Charge charge = JSON.readValue(exchange.getRequestBody(), Charge.class);
        boolean used = transactions.values().stream()
                .anyMatch(transaction -> transaction.reference().equals(charge.reference()));
        if (refusing || used) {
            reply(exchange, 422, new ErrorBody(new ErrorBody.Error("INPUT_VALIDATION_ERROR", null)));
            return;
        }
        charges.add(charge);
        Transaction transaction = Transaction.of(
                "12239576-" + System.nanoTime() + "-" + charges.size(),
                charge.reference(),
                "PENDING",
                charge.amountInCents());
        transactions.put(transaction.id(), transaction);
        reply(exchange, 201, garbling ? Map.of() : new Envelope(transaction));
    }

    private void refund(HttpExchange exchange) throws IOException {
        requests.incrementAndGet();
        if (down) {
            reply(exchange, 503, new ErrorBody(new ErrorBody.Error("SERVICE_UNAVAILABLE", "down")));
            return;
        }
        RefundAsked asked = JSON.readValue(exchange.getRequestBody(), RefundAsked.class);
        refunds.add(asked);
        reply(
                exchange,
                201,
                new Envelope(new RefundBody(
                        refunds.size(),
                        refundStatus,
                        "DECLINED".equals(refundStatus) ? "Tiempo límite sin encontrar fondos excedido" : "",
                        "v2_refund_" + refunds.size(),
                        asked.amountInCents(),
                        asked.transactionId(),
                        asked.reference())));
    }

    private static void reply(HttpExchange exchange, int status, Object body) throws IOException {
        byte[] bytes = JSON.writeValueAsBytes(body);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
