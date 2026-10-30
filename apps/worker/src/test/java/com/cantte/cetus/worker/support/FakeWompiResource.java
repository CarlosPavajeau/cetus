package com.cantte.cetus.worker.support;

import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.ServerSocket;
import java.util.Map;

/** Picks a free port for {@link FakeWompi} and configures sandbox keys that only the tests know. */
public class FakeWompiResource implements QuarkusTestResourceLifecycleManager {

    public static final String PRIVATE_KEY = "prv_test_cetus";
    public static final String EVENTS_SECRET = "test_events_cetus";

    @Override
    public Map<String, String> start() {
        int port = freePort();
        return Map.of(
                "fake-wompi.port",
                String.valueOf(port),
                "cetus.payments.wompi.base-url",
                "http://localhost:" + port + "/v1",
                "cetus.payments.wompi.public-key",
                "pub_test_cetus",
                "cetus.payments.wompi.private-key",
                PRIVATE_KEY,
                "cetus.payments.wompi.integrity-secret",
                "test_integrity_cetus",
                "cetus.payments.wompi.events-secret",
                "test_events_cetus");
    }

    @Override
    public void stop() {}

    private static int freePort() {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
