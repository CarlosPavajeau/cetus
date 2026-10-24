package com.cantte.cetus.api.auth;

import io.vertx.core.buffer.Buffer;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.ext.web.Router;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * /console/** and /admin/** (the console's BFF) and /q/** (health, OpenAPI) are only served to private hosts: Railway's
 * private network (*.railway.internal), localhost and Railway's health check. Through the public domain
 * they answer 404, so they do not depend on a proxy rule. Cloudflare and Railway's edge route by Host, so
 * a request cannot reach the public domain carrying a private Host.
 */
@ApplicationScoped
public class PrivatePaths {

    private static final List<String> PRIVATE_PREFIXES = List.of("/console/", "/admin/", "/q/");
    private static final byte[] NOT_FOUND =
            "{\"code\":\"not_found\",\"message\":\"Not found\",\"details\":null}".getBytes(StandardCharsets.UTF_8);

    @ConfigProperty(name = "cetus.private-hosts")
    List<String> privateHosts;

    void register(@Observes Router router) {
        router.route().order(Integer.MIN_VALUE).handler(ctx -> {
            if (isPrivatePath(ctx.normalizedPath()) && !isPrivateHost(ctx.request())) {
                ctx.response()
                        .setStatusCode(404)
                        .putHeader("Content-Type", "application/json")
                        .end(Buffer.buffer(NOT_FOUND));
                return;
            }
            ctx.next();
        });
    }

    /** {@code path} is already normalized (percent-decoded, no dot segments); repeated slashes count as one. */
    static boolean isPrivatePath(String path) {
        if (path == null) {
            return false;
        }
        String collapsed = path.replaceAll("/{2,}", "/").toLowerCase(Locale.ROOT);
        return PRIVATE_PREFIXES.stream().anyMatch(collapsed::startsWith);
    }

    boolean isPrivateHost(HttpServerRequest request) {
        String host = host(request.getHeader("Host"));
        if (host.isEmpty()) {
            return false;
        }
        for (String allowed : privateHosts) {
            String rule = allowed.trim().toLowerCase(Locale.ROOT);
            if (rule.startsWith("*.") ? host.endsWith(rule.substring(1)) : host.equals(rule)) {
                return true;
            }
        }
        return false;
    }

    /** The Host header without its port; IPv6 literals keep their brackets. */
    static String host(String header) {
        if (header == null) {
            return "";
        }
        String value = header.trim().toLowerCase(Locale.ROOT);
        if (value.startsWith("[")) {
            int end = value.indexOf(']');
            return end < 0 ? value : value.substring(0, end + 1);
        }
        int colon = value.indexOf(':');
        return colon < 0 ? value : value.substring(0, colon);
    }
}
