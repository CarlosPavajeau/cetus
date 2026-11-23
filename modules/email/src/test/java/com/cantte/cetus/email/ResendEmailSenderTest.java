package com.cantte.cetus.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** The real SDK against a local HTTP server that plays Resend. */
class ResendEmailSenderTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    private HttpServer server;
    private final AtomicReference<Exchange> last = new AtomicReference<>();
    private volatile int status = 200;
    private volatile String responseBody = json(new Sent("email-123"));

    record Exchange(String path, String authorization, String idempotencyKey, String body) {}

    record Sent(String id) {}

    record Failure(int statusCode, String name, String message) {}

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            last.set(new Exchange(
                    exchange.getRequestURI().getPath(),
                    exchange.getRequestHeaders().getFirst("Authorization"),
                    exchange.getRequestHeaders().getFirst("Idempotency-Key"),
                    body));
            byte[] response = responseBody.getBytes(StandardCharsets.UTF_8);
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
    void sendsTheEmailWithItsAttachmentsAndIdempotencyKey() {
        String id = sender().send(message(), "delivery-1");

        assertThat(id).isEqualTo("email-123");
        Exchange exchange = last.get();
        assertThat(exchange.path()).isEqualTo("/emails");
        assertThat(exchange.authorization()).isEqualTo("Bearer re_test_key");
        assertThat(exchange.idempotencyKey()).isEqualTo("delivery-1");
        assertThat(exchange.body())
                .contains("\"from\":\"Facturas <facturas@example.com>\"")
                .contains("\"to\":[\"cliente@example.com\"]")
                .contains("\"reply_to\":[\"emisor@example.com\"]")
                .contains("\"subject\":\"900123456;Emisor;SETP1;01;Emisor;\"")
                .contains("\"filename\":\"SETP1.zip\"")
                .contains("\"content\":\"" + Base64.getEncoder().encodeToString(new byte[] {1, 2, 3}) + "\"");
    }

    @Test
    void aRateLimitCanBeRetriedLater() {
        respond(new Failure(429, "rate_limit_exceeded", "Too many requests"));
        assertThatThrownBy(() -> sender().send(message(), "delivery-1"))
                .isInstanceOf(EmailRateLimited.class)
                .hasMessageContaining("rate_limit_exceeded");
    }

    @Test
    void aServerErrorIsTransient() {
        respond(new Failure(500, "internal_server_error", "boom"));
        assertThatThrownBy(() -> sender().send(message(), "delivery-1")).isInstanceOf(EmailTransientException.class);
    }

    @Test
    void aConcurrentRequestWithTheSameKeyIsTransient() {
        respond(new Failure(409, "concurrent_idempotent_requests", "in progress"));
        assertThatThrownBy(() -> sender().send(message(), "delivery-1")).isInstanceOf(EmailTransientException.class);
    }

    @Test
    void aValidationErrorIsRejected() {
        respond(new Failure(422, "validation_error", "Invalid `to` field"));
        assertThatThrownBy(() -> sender().send(message(), "delivery-1"))
                .isInstanceOf(EmailRejectedException.class)
                .hasMessageContaining("Invalid `to` field");
    }

    @Test
    void anUnreachableServerIsTransient() {
        int port = server.getAddress().getPort();
        server.stop(0);
        EmailSender unreachable = new ResendEmailSender(
                "re_test_key", "http://127.0.0.1:" + port, Duration.ofSeconds(1), Duration.ofSeconds(1));
        assertThatThrownBy(() -> unreachable.send(message(), "delivery-1")).isInstanceOf(EmailTransientException.class);
    }

    private void respond(Failure failure) {
        this.status = failure.statusCode();
        this.responseBody = json(failure);
    }

    private static String json(Object body) {
        try {
            return JSON.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private EmailSender sender() {
        return new ResendEmailSender(
                "re_test_key",
                "http://127.0.0.1:" + server.getAddress().getPort(),
                Duration.ofSeconds(2),
                Duration.ofSeconds(2));
    }

    private static EmailMessage message() {
        return new EmailMessage(
                "Facturas <facturas@example.com>",
                "cliente@example.com",
                "emisor@example.com",
                "900123456;Emisor;SETP1;01;Emisor;",
                "<p>Hola</p>",
                "Hola",
                List.of(new EmailMessage.Attachment("SETP1.zip", new byte[] {1, 2, 3})));
    }
}
