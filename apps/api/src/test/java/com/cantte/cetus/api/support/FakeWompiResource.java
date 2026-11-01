package com.cantte.cetus.api.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Wompi API stand-in for the console's saved cards: serves the terms in force and saves a card source for any
 * token, except {@link #DECLINED_TOKEN}, saved as DECLINED, and {@link #INVALID_TOKEN}, refused. Only the private key
 * saves a source.
 */
public class FakeWompiResource implements QuarkusTestResourceLifecycleManager {

    public static final String DECLINED_TOKEN = "tok_test_declined";
    public static final String INVALID_TOKEN = "tok_test_invalid";

    private static final ObjectMapper JSON =
            new ObjectMapper().setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
    private static final AtomicLong SOURCES = new AtomicLong(3890);

    private record Presigned(String acceptanceToken, String permalink, String type) {}

    private record Merchant(Presigned presignedAcceptance, Presigned presignedPersonalDataAuth) {}

    private record PublicData(String bin, String lastFour, String type) {}

    private record Source(long id, PublicData publicData, String type, String status, String customerEmail) {}

    private record Envelope(Object data) {}

    private record ErrorBody(Error error) {
        private record Error(String type, String reason) {}
    }

    private HttpServer server;

    @Override
    public Map<String, String> start() {
        try {
            server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        server.createContext(
                "/v1/merchants/info",
                exchange -> reply(
                        exchange,
                        200,
                        new Envelope(new Merchant(
                                new Presigned("eyJ.policy", "https://wompi.com/terminos.pdf", "END_USER_POLICY"),
                                new Presigned("eyJ.data", "https://wompi.com/datos.pdf", "PERSONAL_DATA_AUTH")))));
        server.createContext("/v1/payment_sources", FakeWompiResource::source);
        server.start();
        return Map.of(
                "cetus.payments.wompi.base-url",
                "http://localhost:" + server.getAddress().getPort() + "/v1");
    }

    @Override
    public void stop() {
        server.stop(0);
    }

    private static void source(HttpExchange exchange) throws IOException {
        if (!"Bearer prv_test_cetus".equals(exchange.getRequestHeaders().getFirst("Authorization"))) {
            reply(exchange, 401, new ErrorBody(new ErrorBody.Error("INVALID_ACCESS_TOKEN", "llave")));
            return;
        }
        JsonNode body = JSON.readTree(exchange.getRequestBody());
        String token = body.path("token").asText();
        if (token.equals(INVALID_TOKEN)
                || body.path("accept_personal_auth").asText().isEmpty()) {
            reply(exchange, 422, new ErrorBody(new ErrorBody.Error("INPUT_VALIDATION_ERROR", null)));
            return;
        }
        reply(
                exchange,
                201,
                new Envelope(new Source(
                        SOURCES.incrementAndGet(),
                        new PublicData("424242", "4242", "CARD"),
                        "CARD",
                        token.equals(DECLINED_TOKEN) ? "DECLINED" : "AVAILABLE",
                        body.path("customer_email").asText())));
    }

    private static void reply(HttpExchange exchange, int status, Object body) throws IOException {
        byte[] bytes = JSON.writeValueAsBytes(body);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
