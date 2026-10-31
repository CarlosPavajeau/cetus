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
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Wompi API stand-in for worker tests: answers GET /v1/transactions/{id} and GET /v1/transactions?reference=
 * from the transactions a test puts, and 503 while {@link #down(boolean)}. Only the private key is accepted.
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

    private record Envelope(Object data) {}

    private record ErrorBody(Error error) {
        private record Error(String type, String reason) {}
    }

    @ConfigProperty(name = "fake-wompi.port")
    int port;

    private final Map<String, Transaction> transactions = new ConcurrentHashMap<>();
    private final AtomicInteger requests = new AtomicInteger();
    private volatile boolean down;
    private HttpServer server;

    @PostConstruct
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", port), 0);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        server.createContext("/v1/transactions", this::handle);
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

    public int requests() {
        return requests.get();
    }

    public void reset() {
        transactions.clear();
        requests.set(0);
        down = false;
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

    private static void reply(HttpExchange exchange, int status, Object body) throws IOException {
        byte[] bytes = JSON.writeValueAsBytes(body);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
