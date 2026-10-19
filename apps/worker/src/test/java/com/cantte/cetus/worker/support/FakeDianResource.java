package com.cantte.cetus.worker.support;

import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.ServerSocket;
import java.util.Map;

/**
 * Picks a free port for {@link FakeDian} and points the DIAN TEST endpoint at it, before the
 * application (and {@code DianClients}) starts.
 */
public class FakeDianResource implements QuarkusTestResourceLifecycleManager {

    @Override
    public Map<String, String> start() {
        int port = freePort();
        return Map.of(
                "fake-dian.port", String.valueOf(port),
                "cetus.dian.test-url", "http://localhost:" + port + "/WcfDianCustomerServices.svc");
    }

    @Override
    public void stop() {
    }

    private static int freePort() {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
