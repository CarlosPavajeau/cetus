package com.cantte.cetus.payments;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The signed parameters of a checkout, for the provider's widget or its hosted page. {@code expirationTime} is
 * the exact text that was signed.
 */
public record Checkout(
        URI url,
        String publicKey,
        String reference,
        long amountCents,
        String currency,
        String expirationTime,
        URI redirectUrl,
        String signature) {

    /** The hosted checkout page with every parameter in its query. */
    public URI link() {
        Map<String, String> query = new LinkedHashMap<>();
        query.put("public-key", publicKey);
        query.put("currency", currency);
        query.put("amount-in-cents", Long.toString(amountCents));
        query.put("reference", reference);
        query.put("signature:integrity", signature);
        query.put("expiration-time", expirationTime);
        query.put("redirect-url", redirectUrl.toString());
        return URI.create(url
                + "?"
                + query.entrySet().stream()
                        .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                        .collect(Collectors.joining("&")));
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
