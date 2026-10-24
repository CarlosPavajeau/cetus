package com.cantte.cetus.api.audit;

import com.cantte.cetus.persistence.audit.RequestOrigin;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.net.SocketAddress;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.HttpHeaders;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.regex.Pattern;

/**
 * IP address and user agent of the current request, for the audit log.
 *
 * <p>Console requests come from the console server (BFF), not from the browser, so on /console/* and
 * /admin/* the BFF forwards the end user's values in X-Cetus-Client-IP and X-Cetus-Client-User-Agent.
 * Those headers reach the API over the private network only; elsewhere they are ignored.
 */
@RequestScoped
public class RequestOriginResolver {

    static final String CLIENT_IP_HEADER = "X-Cetus-Client-IP";
    static final String CLIENT_USER_AGENT_HEADER = "X-Cetus-Client-User-Agent";

    private static final int MAX_USER_AGENT_LENGTH = 512;
    private static final Pattern IPV4 = Pattern.compile("(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})");
    private static final Pattern IPV6 = Pattern.compile("[0-9a-fA-F:.]{2,45}");

    @Inject
    HttpServerRequest request;

    public RequestOrigin resolve() {
        if (isBff(request.path())) {
            return new RequestOrigin(
                    normalizeIp(request.getHeader(CLIENT_IP_HEADER)),
                    truncate(request.getHeader(CLIENT_USER_AGENT_HEADER)));
        }
        SocketAddress remote = request.remoteAddress();
        return new RequestOrigin(
                remote == null ? null : normalizeIp(remote.hostAddress()),
                truncate(request.getHeader(HttpHeaders.USER_AGENT)));
    }

    private static boolean isBff(String path) {
        return path != null
                && (path.equals("/console")
                        || path.startsWith("/console/")
                        || path.equals("/admin")
                        || path.startsWith("/admin/"));
    }

    /**
     * Returns the canonical form of an IPv4/IPv6 literal, or null if the value is not one.
     * The format is checked first so InetAddress never triggers a DNS lookup.
     */
    static String normalizeIp(String value) {
        if (value == null) {
            return null;
        }
        String candidate = value.trim();
        var ipv4 = IPV4.matcher(candidate);
        if (ipv4.matches()) {
            for (int group = 1; group <= 4; group++) {
                if (Integer.parseInt(ipv4.group(group)) > 255) {
                    return null;
                }
            }
        } else if (!candidate.contains(":") || !IPV6.matcher(candidate).matches()) {
            return null;
        }
        try {
            return InetAddress.getByName(candidate).getHostAddress();
        } catch (UnknownHostException e) {
            return null;
        }
    }

    private static String truncate(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return null;
        }
        return userAgent.length() > MAX_USER_AGENT_LENGTH ? userAgent.substring(0, MAX_USER_AGENT_LENGTH) : userAgent;
    }
}
