package com.cantte.cetus.webhooks;

import com.cantte.cetus.domain.model.Environment;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.util.Locale;
import java.util.Optional;

/**
 * Which URLs may receive webhooks. LIVE endpoints must use HTTPS, and no endpoint may point at the
 * network Cetus runs in (loopback, private, link-local, CGNAT...), so a webhook cannot be used to reach
 * internal services (SSRF). Local development and tests relax the second rule.
 */
public final class WebhookTargets {

    private WebhookTargets() {
    }

    /**
     * Checks what can be checked without resolving the host.
     *
     * @return the reason the URL is not acceptable, or empty when it is
     */
    public static Optional<String> problem(String url, Environment environment, boolean allowPrivate) {
        URI uri;
        try {
            uri = new URI(url);
        } catch (URISyntaxException e) {
            return Optional.of("The URL is not valid");
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("https") && !scheme.equals("http")) {
            return Optional.of("The URL must use https");
        }
        if (environment == Environment.LIVE && !scheme.equals("https")) {
            return Optional.of("LIVE endpoints must use https");
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            return Optional.of("The URL must have a host");
        }
        if (uri.getUserInfo() != null) {
            return Optional.of("The URL must not carry credentials");
        }
        if (!allowPrivate && isInternalName(host)) {
            return Optional.of("The URL must point to a public host");
        }
        return Optional.empty();
    }

    /** Whether an address belongs to a network Cetus must not send webhooks to. */
    public static boolean isPrivate(InetAddress address) {
        if (address.isLoopbackAddress() || address.isSiteLocalAddress() || address.isLinkLocalAddress()
                || address.isAnyLocalAddress() || address.isMulticastAddress()) {
            return true;
        }
        byte[] bytes = address.getAddress();
        if (address instanceof Inet4Address) {
            int first = bytes[0] & 0xff;
            int second = bytes[1] & 0xff;
            // 100.64.0.0/10 (carrier-grade NAT), 0.0.0.0/8 and the broadcast address.
            return (first == 100 && second >= 64 && second <= 127) || first == 0 || first == 255;
        }
        if (address instanceof Inet6Address) {
            // fc00::/7, unique local addresses.
            return (bytes[0] & 0xfe) == 0xfc;
        }
        return false;
    }

    private static boolean isInternalName(String host) {
        String name = host.toLowerCase(Locale.ROOT);
        if (name.equals("localhost") || name.endsWith(".localhost") || name.endsWith(".internal")
                || name.endsWith(".local")) {
            return true;
        }
        // Only literal addresses are checked here: InetAddress.getByName does not resolve them.
        if (name.matches("[0-9.]+") || name.startsWith("[")) {
            try {
                return isPrivate(InetAddress.getByName(name.replace("[", "").replace("]", "")));
            } catch (UnknownHostException e) {
                return true;
            }
        }
        return false;
    }
}
