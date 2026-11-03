package com.cantte.cetus.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** The real SDK against a local HTTP server that keeps Resend's segments and contacts in memory. */
class ResendContactListsTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    private HttpServer server;
    private final List<String> calls = new CopyOnWriteArrayList<>();
    private final Map<String, String> segments = new ConcurrentHashMap<>();
    private final Set<String> contacts = ConcurrentHashMap.newKeySet();
    private final Set<String> memberships = ConcurrentHashMap.newKeySet();
    private volatile Integer failWith;

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", this::handle);
        server.start();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    @Test
    void createsTheListAndTheContactOnce() {
        ContactLists lists = lists();

        lists.subscribe("ana@ejemplo.com", "Avísame · Shopify");
        lists.subscribe("luis@ejemplo.com", "Avísame · Shopify");
        lists.subscribe("ana@ejemplo.com", "Avísame · Shopify");

        assertThat(segments).containsOnlyKeys("Avísame · Shopify");
        assertThat(contacts).containsExactlyInAnyOrder("ana@ejemplo.com", "luis@ejemplo.com");
        String segmentId = segments.get("Avísame · Shopify");
        assertThat(memberships)
                .containsExactlyInAnyOrder("ana@ejemplo.com/" + segmentId, "luis@ejemplo.com/" + segmentId);
        assertThat(calls.stream().filter(call -> call.equals("GET /segments"))).hasSize(1);
        assertThat(calls.stream().filter(call -> call.equals("POST /contacts"))).hasSize(2);
    }

    @Test
    void reusesAListThatAlreadyExists() {
        segments.put("Avísame · WooCommerce", "seg-existing");

        lists().subscribe("ana@ejemplo.com", "Avísame · WooCommerce");

        assertThat(calls).doesNotContain("POST /segments");
        assertThat(memberships).containsExactly("ana@ejemplo.com/seg-existing");
    }

    @Test
    void aRateLimitCanBeRetriedLater() {
        failWith = 429;
        assertThatThrownBy(() -> lists().subscribe("ana@ejemplo.com", "Avísame · Shopify"))
                .isInstanceOf(EmailRateLimited.class);
    }

    private ContactLists lists() {
        return new ResendContactLists(
                "re_test_key",
                "http://127.0.0.1:" + server.getAddress().getPort(),
                Duration.ofSeconds(2),
                Duration.ofSeconds(2));
    }

    private void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();
        byte[] request = exchange.getRequestBody().readAllBytes();
        calls.add(method + " " + path);
        if (failWith != null) {
            respond(exchange, failWith, error(failWith, "rate_limit_exceeded"));
            return;
        }
        String[] parts = path.substring(1).split("/");
        if (path.equals("/segments") && method.equals("GET")) {
            List<Map<String, String>> data = segments.entrySet().stream()
                    .map(entry -> Map.of("id", entry.getValue(), "name", entry.getKey()))
                    .toList();
            respond(exchange, 200, Map.of("object", "list", "data", data));
        } else if (path.equals("/segments") && method.equals("POST")) {
            String name = JSON.readTree(request).get("name").asText();
            String id = "seg-" + segments.size();
            segments.put(name, id);
            respond(exchange, 201, Map.of("object", "segment", "id", id, "name", name));
        } else if (parts.length == 2 && parts[0].equals("contacts") && method.equals("GET")) {
            if (contacts.contains(parts[1])) {
                respond(exchange, 200, Map.of("object", "contact", "id", "c-1", "email", parts[1]));
            } else {
                respond(exchange, 404, error(404, "not_found"));
            }
        } else if (path.equals("/contacts") && method.equals("POST")) {
            contacts.add(JSON.readTree(request).get("email").asText());
            respond(exchange, 201, Map.of("object", "contact", "id", "c-1"));
        } else if (parts.length == 4 && parts[0].equals("contacts") && parts[2].equals("segments")) {
            memberships.add(parts[1] + "/" + parts[3]);
            respond(exchange, 201, Map.of("id", parts[3]));
        } else {
            respond(exchange, 404, error(404, "not_found"));
        }
    }

    private static Map<String, Object> error(int status, String name) {
        return Map.of("statusCode", status, "name", name, "message", name);
    }

    private static void respond(HttpExchange exchange, int status, Object body) throws IOException {
        byte[] bytes = JSON.writeValueAsBytes(body);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
