package com.cantte.cetus.payments;

import java.net.URI;
import java.util.List;

/**
 * The four Wompi keys of one environment. The environment comes from their prefixes, and keys of different
 * environments are refused. {@link #toString()} never prints a key.
 */
public final class WompiKeys {

    /** Wompi's two environments, with the name its events carry and its API. */
    public enum Environment {
        SANDBOX("test", URI.create("https://sandbox.wompi.co/v1")),
        PRODUCTION("prod", URI.create("https://production.wompi.co/v1"));

        private final String code;
        private final URI baseUrl;

        Environment(String code, URI baseUrl) {
            this.code = code;
            this.baseUrl = baseUrl;
        }

        /** {@code test} or {@code prod}, as in the keys' prefixes and the events' {@code environment}. */
        public String code() {
            return code;
        }

        public URI baseUrl() {
            return baseUrl;
        }
    }

    private final Environment environment;
    private final String publicKey;
    private final String privateKey;
    private final String integritySecret;
    private final String eventsSecret;

    public WompiKeys(String publicKey, String privateKey, String integritySecret, String eventsSecret) {
        this.environment = environmentOf(publicKey, "pub_%s_");
        List<String> others = List.of(privateKey, integritySecret, eventsSecret);
        List<String> formats = List.of("prv_%s_", "%s_integrity_", "%s_events_");
        for (int i = 0; i < others.size(); i++) {
            if (environmentOf(others.get(i), formats.get(i)) != environment) {
                throw new IllegalArgumentException("The Wompi keys belong to different environments");
            }
        }
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.integritySecret = integritySecret;
        this.eventsSecret = eventsSecret;
    }

    private static Environment environmentOf(String key, String format) {
        if (key != null) {
            for (Environment candidate : Environment.values()) {
                if (key.startsWith(format.formatted(candidate.code))) {
                    return candidate;
                }
            }
        }
        throw new IllegalArgumentException(
                "A Wompi key does not start with " + format.formatted("test") + " or " + format.formatted("prod"));
    }

    public Environment environment() {
        return environment;
    }

    public String publicKey() {
        return publicKey;
    }

    String privateKey() {
        return privateKey;
    }

    String integritySecret() {
        return integritySecret;
    }

    String eventsSecret() {
        return eventsSecret;
    }

    @Override
    public String toString() {
        return "WompiKeys[" + environment + "]";
    }
}
