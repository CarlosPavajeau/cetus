package com.cantte.cetus.email;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The real SDK against a local HTTP server that plays Resend. */
class ResendEmailSenderTest {

    private HttpServer server;
    private final AtomicReference<Exchange> last = new AtomicReference<>();
    private volatile int status = 200;
    private volatile String responseBody = "{\"id\":\"email-123\"}";

    record Exchange(String path, String authorization, String idempotencyKey, String body) {
    }

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            last.set(new Exchange(exchange.getRequestURI().getPath(),
                    exchange.getRequestHeaders().getFirst("Authorization"),
                    exchange.getRequestHeaders().getFirst("Idempotency-Key"), body));
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
                .contains("\"content\":\"" + Base64.getEncoder().encodeToString(new byte[]{1, 2, 3}) + "\"");
    }

    @Test
    void aRateLimitCanBeRetriedLater() {
        respond(429, "{\"statusCode\":429,\"name\":\"rate_limit_exceeded\",\"message\":\"Too many requests\"}");
        assertThatThrownBy(() -> sender().send(message(), "delivery-1"))
                .isInstanceOf(EmailRateLimited.class)
                .hasMessageContaining("rate_limit_exceeded");
    }

    @Test
    void aServerErrorIsTransient() {
        respond(500, "{\"statusCode\":500,\"name\":\"internal_server_error\",\"message\":\"boom\"}");
        assertThatThrownBy(() -> sender().send(message(), "delivery-1")).isInstanceOf(EmailTransientException.class);
    }

    @Test
    void aConcurrentRequestWithTheSameKeyIsTransient() {
        respond(409, "{\"statusCode\":409,\"name\":\"concurrent_idempotent_requests\",\"message\":\"in progress\"}");
        assertThatThrownBy(() -> sender().send(message(), "delivery-1")).isInstanceOf(EmailTransientException.class);
    }

    @Test
    void aValidationErrorIsRejected() {
        respond(422, "{\"statusCode\":422,\"name\":\"validation_error\",\"message\":\"Invalid `to` field\"}");
        assertThatThrownBy(() -> sender().send(message(), "delivery-1"))
                .isInstanceOf(EmailRejectedException.class)
                .hasMessageContaining("Invalid `to` field");
    }

    @Test
    void anUnreachableServerIsTransient() {
        int port = server.getAddress().getPort();
        server.stop(0);
        EmailSender unreachable = new ResendEmailSender("re_test_key", "http://127.0.0.1:" + port,
                Duration.ofSeconds(1), Duration.ofSeconds(1));
        assertThatThrownBy(() -> unreachable.send(message(), "delivery-1")).isInstanceOf(EmailTransientException.class);
    }

    private void respond(int status, String body) {
        this.status = status;
        this.responseBody = body;
    }

    private EmailSender sender() {
        return new ResendEmailSender("re_test_key", "http://127.0.0.1:" + server.getAddress().getPort(),
                Duration.ofSeconds(2), Duration.ofSeconds(2));
    }

    private static EmailMessage message() {
        return new EmailMessage("Facturas <facturas@example.com>", "cliente@example.com", "emisor@example.com",
                "900123456;Emisor;SETP1;01;Emisor;", "<p>Hola</p>", "Hola",
                List.of(new EmailMessage.Attachment("SETP1.zip", new byte[]{1, 2, 3})));
    }
}
