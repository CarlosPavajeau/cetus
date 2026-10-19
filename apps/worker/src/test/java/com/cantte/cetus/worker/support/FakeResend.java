package com.cantte.cetus.worker.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;

/**
 * Resend API stand-in for worker tests: records every POST /emails and answers with the queued replies,
 * or with a fresh email id when none is queued. Like Resend, a repeated idempotency key gets the same id.
 */
@ApplicationScoped
public class FakeResend {

    private static final ObjectMapper JSON = new ObjectMapper();

    public record Reply(int status, String body) {

        public static Reply error(int status, String name, String message) {
            return new Reply(status, "{\"statusCode\":" + status + ",\"name\":\"" + name + "\",\"message\":\"" + message + "\"}");
        }
    }

    /** A request received: its authorization and idempotency headers and the parsed JSON body. */
    public record Request(String authorization, String idempotencyKey, JsonNode body) {
    }

    @ConfigProperty(name = "fake-resend.port")
    int port;

    private final Deque<Reply> replies = new ArrayDeque<>();
    private final List<Request> requests = new CopyOnWriteArrayList<>();
    private HttpServer server;

    @PostConstruct
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", port), 0);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        server.createContext("/emails", this::handle);
        server.start();
    }

    @PreDestroy
    void stop() {
        server.stop(0);
    }

    public synchronized void reply(Reply... queued) {
        replies.addAll(List.of(queued));
    }

    public List<Request> requests() {
        return List.copyOf(requests);
    }

    public synchronized void reset() {
        replies.clear();
        requests.clear();
    }

    private void handle(HttpExchange exchange) throws IOException {
        JsonNode body = JSON.readTree(exchange.getRequestBody().readAllBytes());
        String key = exchange.getRequestHeaders().getFirst("Idempotency-Key");
        requests.add(new Request(exchange.getRequestHeaders().getFirst("Authorization"), key, body));
        Reply reply;
        synchronized (this) {
            reply = replies.poll();
        }
        if (reply == null) {
            reply = new Reply(200, "{\"id\":\"email-" + key + "\"}");
        }
        byte[] bytes = reply.body().getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(reply.status(), bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
