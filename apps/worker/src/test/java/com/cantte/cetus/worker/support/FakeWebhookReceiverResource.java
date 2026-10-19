package com.cantte.cetus.worker.support;

import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.ServerSocket;
import java.util.Map;

/** Picks a free port for {@link FakeWebhookReceiver}. */
public class FakeWebhookReceiverResource implements QuarkusTestResourceLifecycleManager {

    @Override
    public Map<String, String> start() {
        try (ServerSocket socket = new ServerSocket(0)) {
            return Map.of("fake-webhooks.port", String.valueOf(socket.getLocalPort()));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public void stop() {
    }
}
