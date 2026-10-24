package com.cantte.cetus.worker.support;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * DIAN web services stand-in for worker tests. Each operation answers with the replies queued for it,
 * built from responses captured in habilitación (src/test/resources/dian). It does not verify
 * WS-Security; apps/dian-mock covers that.
 */
@ApplicationScoped
public class FakeDian {

    private static final Pattern ACTION = Pattern.compile("action=\"[^\"]*/(\\w+)\"");

    /** What to answer to one call. */
    public record Reply(int status, String body, Duration delay, boolean drop) {

        public static Reply fixture(String name) {
            return new Reply(200, read(name), Duration.ZERO, false);
        }

        /** Server faults come with HTTP 500, as WCF sends them. */
        public static Reply fault(String name) {
            return new Reply(500, read(name), Duration.ZERO, false);
        }

        /** Answers after the worker's request timeout (PT1S in tests) has expired. */
        public static Reply late(String name) {
            return new Reply(200, read(name), Duration.ofSeconds(3), false);
        }

        public static Reply httpError(int status) {
            return new Reply(status, "Service Unavailable", Duration.ZERO, false);
        }

        public static Reply dropConnection() {
            return new Reply(0, null, Duration.ZERO, true);
        }

        private static String read(String name) {
            try (InputStream in = FakeDian.class.getResourceAsStream("/dian/" + name)) {
                if (in == null) {
                    throw new IllegalArgumentException("Missing fixture dian/" + name);
                }
                return new String(in.readAllBytes(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        }
    }

    /** A request received, with its SOAP operation. */
    public record Call(String operation, String body) {}

    @ConfigProperty(name = "fake-dian.port")
    int port;

    private final Map<String, Deque<Reply>> replies = new ConcurrentHashMap<>();
    private final List<Call> calls = new CopyOnWriteArrayList<>();
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

    /** Queues the replies for an operation (SendBillSync, GetStatus...), answered in order. */
    public void reply(String operation, Reply... queued) {
        replies.computeIfAbsent(operation, op -> new ArrayDeque<>()).addAll(List.of(queued));
    }

    public List<Call> calls() {
        return List.copyOf(calls);
    }

    public List<String> operations() {
        return calls.stream().map(Call::operation).toList();
    }

    public void reset() {
        replies.clear();
        calls.clear();
    }

    private void handle(HttpExchange exchange) throws IOException {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Matcher action =
                ACTION.matcher(String.valueOf(exchange.getRequestHeaders().getFirst("Content-Type")));
        String operation = action.find() ? action.group(1) : "unknown";
        calls.add(new Call(operation, body));

        Deque<Reply> queue = replies.get(operation);
        Reply reply;
        synchronized (this) {
            reply = queue == null ? null : queue.poll();
        }
        if (reply == null) {
            send(exchange, 500, "No reply queued for " + operation);
            return;
        }
        if (reply.drop()) {
            exchange.close();
            return;
        }
        if (!reply.delay().isZero()) {
            try {
                Thread.sleep(reply.delay());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        send(exchange, reply.status(), reply.body());
    }

    private static void send(HttpExchange exchange, int status, String body) {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        try {
            exchange.getResponseHeaders().set("Content-Type", "application/soap+xml; charset=utf-8");
            exchange.sendResponseHeaders(status, bytes.length);
            exchange.getResponseBody().write(bytes);
        } catch (IOException e) {
            // The client gave up (timeout scenarios); nothing to answer.
        } finally {
            exchange.close();
        }
    }
}
