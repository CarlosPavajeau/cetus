package com.cantte.cetus.worker.support;

import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.ServerSocket;
import java.util.Map;

/**
 * Picks a free port for {@link FakeResend} and configures email delivery against it, with a test-only key
 * and sender and the mailbox that receives TEST documents.
 */
public class FakeResendResource implements QuarkusTestResourceLifecycleManager {

    public static final String API_KEY = "re_test_only_key";
    public static final String FROM = "Facturas Cetus <facturas@cetus.test>";
    public static final String TEST_RECIPIENT = "buzon-pruebas@cetus.test";

    @Override
    public Map<String, String> start() {
        int port = freePort();
        return Map.of(
                "fake-resend.port", String.valueOf(port),
                "cetus.email.resend.base-url", "http://localhost:" + port,
                "cetus.email.resend.api-key", API_KEY,
                "cetus.email.from", FROM,
                "cetus.email.test-recipient", TEST_RECIPIENT);
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
