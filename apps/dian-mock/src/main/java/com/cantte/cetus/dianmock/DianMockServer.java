package com.cantte.cetus.dianmock;

import com.cantte.cetus.dian.simulated.SimulatedDian;
import com.cantte.cetus.signing.KeyMaterial;
import com.cantte.cetus.signing.Pkcs12Loader;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/**
 * Local DIAN for development. SOAP is accepted on any path (point the worker at
 * {@code http://localhost:8090/WcfDianCustomerServices.svc}); {@code /__mock/*} controls it:
 *
 * <pre>
 * GET  /__mock                      current scenario and counters
 * POST /__mock/scenario?name=reject accept | reject | client-fault | server-fault | timeout
 * POST /__mock/latency?value=PT1S  delay before every SOAP answer (ISO-8601 duration)
 * GET  /__mock/documents            documents received
 * POST /__mock/reset                forget every document
 * </pre>
 *
 * Environment: DIAN_MOCK_PORT (8090), DIAN_MOCK_SCENARIO (accept), DIAN_MOCK_REJECT_SELF_SIGNED (false),
 * DIAN_MOCK_TIMEOUT_DELAY (PT90S, above the worker's request timeout), DIAN_MOCK_PROCESSING_POLLS (1),
 * DIAN_MOCK_LATENCY (PT0S, the delay before every SOAP answer; benchmarks use it to stand in for the real DIAN),
 * DIAN_MOCK_SIGNER (src/test/resources/test-signer.p12, the certificate that signs the ApplicationResponse) and
 * DIAN_MOCK_SIGNER_PASSWORD (cetus-test).
 */
public final class DianMockServer {

    private DianMockServer() {
    }

    public static void main(String[] args) {
        int port = Integer.parseInt(env("DIAN_MOCK_PORT", "8090"));
        Clock clock = Clock.systemUTC();
        MockDian dian = new MockDian(
                Scenario.parse(env("DIAN_MOCK_SCENARIO", "accept")),
                Boolean.parseBoolean(env("DIAN_MOCK_REJECT_SELF_SIGNED", "false")),
                Duration.parse(env("DIAN_MOCK_TIMEOUT_DELAY", "PT90S")),
                Integer.parseInt(env("DIAN_MOCK_PROCESSING_POLLS", "1")),
                new SimulatedDian(signer(), clock),
                clock);
        dian.latency(Duration.parse(env("DIAN_MOCK_LATENCY", "PT0S")));
        HttpServer server = start(port, dian);
        log("DIAN mock listening on http://localhost:" + server.getAddress().getPort()
                + "/WcfDianCustomerServices.svc (scenario " + dian.scenario().label() + ")");
    }

    private static KeyMaterial signer() {
        Path file = Path.of(env("DIAN_MOCK_SIGNER", "src/test/resources/test-signer.p12"));
        try {
            return Pkcs12Loader.load(Files.readAllBytes(file),
                    env("DIAN_MOCK_SIGNER_PASSWORD", "cetus-test").toCharArray());
        } catch (IOException e) {
            throw new IllegalStateException("Could not read the DIAN mock's signer " + file.toAbsolutePath(), e);
        }
    }

    static HttpServer start(int port, MockDian dian) {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
            // Virtual threads: the timeout scenario parks requests for a long time.
            server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
            server.createContext("/", exchange -> handle(exchange, dian));
            server.start();
            return server;
        } catch (IOException e) {
            throw new IllegalStateException("Could not start the DIAN mock on port " + port, e);
        }
    }

    private static void handle(HttpExchange exchange, MockDian dian) throws IOException {
        try (exchange) {
            URI uri = exchange.getRequestURI();
            String method = exchange.getRequestMethod();
            if (uri.getPath().startsWith("/__mock")) {
                control(exchange, dian, method, uri);
                return;
            }
            if (!"POST".equals(method)) {
                send(exchange, 405, "text/plain", "DIAN mock: SOAP 1.2 requests are POSTed\n");
                return;
            }
            MockDian.Reply reply = dian.handle(exchange.getRequestBody().readAllBytes());
            Duration latency = dian.latency();
            if (!latency.isZero()) {
                Thread.sleep(latency);
            }
            log(reply.summary());
            send(exchange, reply.status(), "application/soap+xml; charset=utf-8", reply.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (RuntimeException e) {
            log("internal error: " + e);
            send(exchange, 500, "application/soap+xml; charset=utf-8", Soap.fault("s:Receiver",
                    "a:InternalServiceFault", "DIAN mock internal error: " + e.getMessage()));
        }
    }

    private static void control(HttpExchange exchange, MockDian dian, String method, URI uri) throws IOException {
        String path = uri.getPath();
        if ("GET".equals(method) && ("/__mock".equals(path) || "/__mock/".equals(path))) {
            send(exchange, 200, "text/plain", "scenario: " + dian.scenario().label() + "\nlatency: "
                    + dian.latency() + "\nreceived: " + dian.received().size() + "\n");
        } else if ("POST".equals(method) && "/__mock/scenario".equals(path)) {
            String name = query(uri, "name");
            try {
                dian.scenario(Scenario.parse(name == null ? "" : name));
            } catch (IllegalArgumentException e) {
                send(exchange, 400, "text/plain", "unknown scenario '" + name + "', use one of: "
                        + Arrays.stream(Scenario.values()).map(Scenario::label).collect(Collectors.joining(", ")) + "\n");
                return;
            }
            log("scenario set to " + dian.scenario().label());
            send(exchange, 200, "text/plain", "scenario: " + dian.scenario().label() + "\n");
        } else if ("POST".equals(method) && "/__mock/latency".equals(path)) {
            String value = query(uri, "value");
            try {
                dian.latency(Duration.parse(value == null ? "" : value));
            } catch (RuntimeException e) {
                send(exchange, 400, "text/plain", "invalid latency '" + value + "', use an ISO-8601 duration such as"
                        + " PT1.5S\n");
                return;
            }
            log("latency set to " + dian.latency());
            send(exchange, 200, "text/plain", "latency: " + dian.latency() + "\n");
        } else if ("GET".equals(method) && "/__mock/documents".equals(path)) {
            String lines = dian.received().stream()
                    .map(r -> r.at() + "  " + r.operation() + "  " + r.fileName() + "  " + r.number() + "  "
                            + r.documentKey() + "  " + r.outcome())
                    .collect(Collectors.joining("\n"));
            send(exchange, 200, "text/plain", lines.isEmpty() ? "no documents received\n" : lines + "\n");
        } else if ("POST".equals(method) && "/__mock/reset".equals(path)) {
            dian.reset();
            log("state reset");
            send(exchange, 200, "text/plain", "reset\n");
        } else {
            send(exchange, 404, "text/plain", "unknown control endpoint " + method + " " + path + "\n");
        }
    }

    private static String query(URI uri, String name) {
        if (uri.getQuery() == null) {
            return null;
        }
        for (String pair : uri.getQuery().split("&")) {
            String[] parts = pair.split("=", 2);
            if (parts[0].equals(name)) {
                return parts.length > 1 ? parts[1] : "";
            }
        }
        return null;
    }

    private static void send(HttpExchange exchange, int status, String contentType, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }

    static void log(String message) {
        System.out.println(LocalTime.now().truncatedTo(ChronoUnit.MILLIS) + " [dian-mock] " + message);
    }

    private static String env(String name, String fallback) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? fallback : value;
    }
}
