package com.cantte.cetus.worker.support;

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
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * An integrator's webhook endpoint for worker tests: records every POST and answers with the queued
 * replies (optionally late, to force a timeout), or 200 when none is queued.
 */
@ApplicationScoped
public class FakeWebhookReceiver {

    public record Reply(int status, String body, long delayMillis) {

        public static Reply status(int status) {
            return new Reply(status, "", 0);
        }

        public static Reply late() {
            return new Reply(200, "", 3000);
        }
    }

    /** A request received: its path, headers (lower-case names, first value) and body. */
    public record Request(String path, Map<String, String> headers, String body) {}

    @ConfigProperty(name = "fake-webhooks.port")
    int port;

    private final Deque<Reply> replies = new ArrayDeque<>();
    private final List<Request> requests = new CopyOnWriteArrayList<>();
    private HttpServer server;

    @PostConstruct
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", port), 0);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        server.createContext("/", this::handle);
        server.start();
    }

    @PreDestroy
    void stop() {
        server.stop(0);
    }

    /** The URL of an endpoint on this receiver. */
    public String url(String path) {
        return "http://localhost:" + port + path;
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
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> headers = new HashMap<>();
        exchange.getRequestHeaders().forEach((name, values) -> headers.put(name.toLowerCase(), values.get(0)));
        requests.add(new Request(exchange.getRequestURI().getPath(), headers, body));
        Reply reply;
        synchronized (this) {
            reply = replies.poll();
        }
        if (reply == null) {
            reply = Reply.status(200);
        }
        if (reply.delayMillis() > 0) {
            try {
                Thread.sleep(reply.delayMillis());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        byte[] bytes = reply.body().getBytes(StandardCharsets.UTF_8);
        try {
            exchange.sendResponseHeaders(reply.status(), bytes.length == 0 ? -1 : bytes.length);
            if (bytes.length > 0) {
                exchange.getResponseBody().write(bytes);
            }
        } catch (IOException e) {
            // The worker gave up waiting (timeout scenario).
        } finally {
            exchange.close();
        }
    }
}
