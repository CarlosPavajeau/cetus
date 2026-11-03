package com.cantte.cetus.worker.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Resend API stand-in for worker tests: records every POST /emails and answers with the queued replies,
 * or with a fresh email id when none is queued. Like Resend, a repeated idempotency key gets the same id.
 */
@ApplicationScoped
public class FakeResend {

    private static final ObjectMapper JSON = new ObjectMapper();

    public record Reply(int status, String body) {

        public static Reply error(int status, String name, String message) {
            return new Reply(
                    status,
                    "{\"statusCode\":" + status + ",\"name\":\"" + name + "\",\"message\":\"" + message + "\"}");
        }
    }

    /** A request received: its authorization and idempotency headers and the parsed JSON body. */
    public record Request(String authorization, String idempotencyKey, JsonNode body) {}

    @ConfigProperty(name = "fake-resend.port")
    int port;

    private final Deque<Reply> replies = new ArrayDeque<>();
    private final List<Request> requests = new CopyOnWriteArrayList<>();
    private final Map<String, String> segments = new ConcurrentHashMap<>();
    private final Set<String> memberships = ConcurrentHashMap.newKeySet();
    private final Set<String> listAuthorizations = ConcurrentHashMap.newKeySet();
    private HttpServer server;

    @PostConstruct
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", port), 0);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        server.createContext("/emails", this::handle);
        server.createContext("/segments", this::segment);
        server.createContext("/contacts", this::contact);
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
        segments.clear();
        memberships.clear();
        listAuthorizations.clear();
    }

    /** The Authorization headers of the segment and contact calls. */
    public Set<String> listAuthorizations() {
        return Set.copyOf(listAuthorizations);
    }

    /** "address/segment name" for every address added to a segment (an "Avísame" list). */
    public Set<String> memberships() {
        Map<String, String> names = new HashMap<>();
        segments.forEach((name, id) -> names.put(id, name));
        Set<String> named = new HashSet<>();
        memberships.forEach(membership -> {
            int slash = membership.lastIndexOf('/');
            named.add(membership.substring(0, slash) + "/" + names.get(membership.substring(slash + 1)));
        });
        return named;
    }

    private void segment(HttpExchange exchange) throws IOException {
        listAuthorizations.add(exchange.getRequestHeaders().getFirst("Authorization"));
        if (exchange.getRequestMethod().equals("POST")) {
            String name = JSON.readTree(exchange.getRequestBody().readAllBytes())
                    .get("name")
                    .asText();
            String id = segments.computeIfAbsent(name, ignored -> "seg-" + UUID.randomUUID());
            json(exchange, 201, Map.of("object", "segment", "id", id, "name", name));
            return;
        }
        List<Map<String, String>> data = segments.entrySet().stream()
                .map(entry -> Map.of("id", entry.getValue(), "name", entry.getKey()))
                .toList();
        json(exchange, 200, Map.of("object", "list", "data", data));
    }

    /** Every address exists already; adding one to a segment is recorded. */
    private void contact(HttpExchange exchange) throws IOException {
        listAuthorizations.add(exchange.getRequestHeaders().getFirst("Authorization"));
        String[] parts = exchange.getRequestURI().getPath().substring(1).split("/");
        if (parts.length == 4 && parts[2].equals("segments")) {
            memberships.add(parts[1] + "/" + parts[3]);
            json(exchange, 201, Map.of("id", parts[3]));
            return;
        }
        json(exchange, 200, Map.of("object", "contact", "id", "contact-1"));
    }

    private static void json(HttpExchange exchange, int status, Object body) throws IOException {
        byte[] bytes = JSON.writeValueAsBytes(body);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
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
