package com.cantte.cetus.payments;

import com.cantte.cetus.payments.EventCheck.Invalid;
import com.cantte.cetus.payments.EventCheck.OtherEnvironment;
import com.cantte.cetus.payments.EventCheck.Verified;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * {@link PaymentGateway} on Wompi's REST API (https://docs.wompi.co/docs/colombia/). Checkouts are signed with
 * the integrity secret, transactions are read with the private key and events are authenticated with the
 * events secret. One instance per set of keys: its HttpClient and connection pool are shared by every call.
 */
public final class WompiGateway implements PaymentGateway {

    public static final URI CHECKOUT_URL = URI.create("https://checkout.wompi.co/p/");

    private static final int NOT_FOUND = 404;
    private static final int TOO_MANY_REQUESTS = 429;
    /** Wompi signs the expiration as written; this is the format of its examples, always with milliseconds. */
    private static final DateTimeFormatter EXPIRATION_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);

    private final WompiKeys keys;
    private final URI baseUrl;
    private final Duration readTimeout;
    private final HttpClient http;
    private final ObjectMapper json = new ObjectMapper();

    /** {@code baseUrl} is the environment's API, or a fake in tests. */
    public WompiGateway(WompiKeys keys, URI baseUrl, Duration connectTimeout, Duration readTimeout) {
        this.keys = keys;
        this.baseUrl = baseUrl;
        this.readTimeout = readTimeout;
        this.http = HttpClient.newBuilder().connectTimeout(connectTimeout).build();
    }

    public WompiGateway(WompiKeys keys, Duration connectTimeout, Duration readTimeout) {
        this(keys, keys.environment().baseUrl(), connectTimeout, readTimeout);
    }

    @Override
    public Checkout checkout(CheckoutRequest request) {
        String expirationTime = EXPIRATION_FORMAT.format(request.expiresAt().truncatedTo(ChronoUnit.MILLIS));
        String signature = sha256(request.reference()
                + request.amountCents()
                + request.currency()
                + expirationTime
                + keys.integritySecret());
        return new Checkout(
                CHECKOUT_URL,
                keys.publicKey(),
                request.reference(),
                request.amountCents(),
                request.currency(),
                expirationTime,
                request.redirectUrl(),
                signature);
    }

    @Override
    public Optional<PaymentTransaction> transaction(String id) {
        HttpRequest request = HttpRequest.newBuilder(
                        URI.create(baseUrl + "/transactions/" + URLEncoder.encode(id, StandardCharsets.UTF_8)))
                .timeout(readTimeout)
                .header("Accept", "application/json")
                .header("Authorization", "Bearer " + keys.privateKey())
                .GET()
                .build();
        HttpResponse<String> response = send(request);
        if (response.statusCode() == NOT_FOUND) {
            return Optional.empty();
        }
        return Optional.of(transactionOf(data(response)));
    }

    @Override
    public EventCheck verifyEvent(String body) {
        JsonNode event;
        try {
            event = json.readTree(body);
        } catch (JsonProcessingException e) {
            return new Invalid("not JSON");
        }
        if (event == null || !event.isObject()) {
            return new Invalid("not an event");
        }
        JsonNode signature = event.path("signature");
        JsonNode properties = signature.path("properties");
        String checksum = signature.path("checksum").asText("");
        JsonNode timestamp = event.path("timestamp");
        if (!properties.isArray() || properties.isEmpty() || checksum.isEmpty() || !timestamp.isIntegralNumber()) {
            return new Invalid("unsigned");
        }
        StringBuilder signed = new StringBuilder();
        List<String> values = new ArrayList<>();
        JsonNode data = event.path("data");
        for (JsonNode property : properties) {
            JsonNode value = data;
            for (String step : property.asText().split("\\.")) {
                value = value.path(step);
            }
            if (!value.isValueNode()) {
                return new Invalid("signed property missing");
            }
            values.add(value.asText());
            signed.append(value.asText());
        }
        signed.append(timestamp.asText()).append(keys.eventsSecret());
        if (!MessageDigest.isEqual(
                sha256(signed.toString()).getBytes(StandardCharsets.US_ASCII),
                checksum.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII))) {
            return new Invalid("checksum mismatch");
        }
        String environment = event.path("environment").asText("");
        if (!environment.equals(keys.environment().code())) {
            return new OtherEnvironment(environment);
        }
        String type = event.path("event").asText("");
        Optional<String> transactionId = Optional.of(data.path("transaction").path("id"))
                .filter(JsonNode::isValueNode)
                .map(JsonNode::asText);
        // The signed properties name what the event says (id, status, amount): a resend carries the same ones.
        return new Verified(new PaymentEvent(type + ":" + String.join(":", values), type, transactionId));
    }

    private HttpResponse<String> send(HttpRequest request) {
        HttpResponse<String> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new PaymentTransientException("Wompi unreachable: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PaymentTransientException("Interrupted while calling Wompi", e);
        }
        int status = response.statusCode();
        if (status >= 500 || status == TOO_MANY_REQUESTS) {
            throw new PaymentTransientException("Wompi " + status + errorOf(response.body()), null);
        }
        if (status >= 400 && status != NOT_FOUND) {
            throw new PaymentRejectedException("Wompi " + status + errorOf(response.body()), null);
        }
        return response;
    }

    /** Only the error's type and reason: Wompi's validation messages may echo the request. */
    private String errorOf(String body) {
        try {
            JsonNode error = json.readTree(body).path("error");
            String type = error.path("type").asText("");
            String reason = error.path("reason").asText("");
            return type.isEmpty() ? "" : " " + type + (reason.isEmpty() ? "" : ": " + reason);
        } catch (JsonProcessingException e) {
            return "";
        }
    }

    private JsonNode data(HttpResponse<String> response) {
        try {
            JsonNode data = json.readTree(response.body()).path("data");
            if (!data.isObject()) {
                throw new PaymentRejectedException("Wompi answered without data", null);
            }
            return data;
        } catch (JsonProcessingException e) {
            throw new PaymentRejectedException("Wompi answered what is not JSON", e);
        }
    }

    private static PaymentTransaction transactionOf(JsonNode data) {
        try {
            return new PaymentTransaction(
                    required(data, "id"),
                    required(data, "reference"),
                    PaymentStatus.valueOf(required(data, "status")),
                    Long.parseLong(required(data, "amount_in_cents")),
                    required(data, "currency"),
                    required(data, "payment_method_type"),
                    optional(data, "status_message"),
                    Instant.parse(required(data, "created_at")),
                    optional(data, "finalized_at").map(Instant::parse),
                    data.toString());
        } catch (IllegalArgumentException | DateTimeParseException e) {
            throw new PaymentRejectedException("Unreadable Wompi transaction: " + e.getMessage(), e);
        }
    }

    private static String required(JsonNode data, String field) {
        return optional(data, field).orElseThrow(() -> new IllegalArgumentException("missing " + field));
    }

    private static Optional<String> optional(JsonNode data, String field) {
        JsonNode value = data.path(field);
        return value.isValueNode() && !value.isNull() ? Optional.of(value.asText()) : Optional.empty();
    }

    static String sha256(String text) {
        try {
            return HexFormat.of()
                    .formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Every JDK has SHA-256", e);
        }
    }
}
