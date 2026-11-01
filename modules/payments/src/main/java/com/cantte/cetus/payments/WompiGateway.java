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
import java.util.Arrays;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * {@link PaymentGateway} on Wompi's REST API (https://docs.wompi.co/docs/colombia/). Checkouts and charges are
 * signed with the integrity secret, transactions and payment sources go with the private key and events are
 * authenticated with the events secret. One instance per set of keys: its HttpClient and connection pool are shared by every call.
 */
public final class WompiGateway implements PaymentGateway {

    public static final URI CHECKOUT_URL = URI.create("https://checkout.wompi.co/p/");

    /**
     * The signed properties of a transaction event, in Wompi's order. Only with exactly these, and values of their
     * shapes, does an event name a transaction: the checksum covers the values joined without a separator, not the
     * property names, so any other list could cut the same text into another id.
     */
    private static final List<String> TRANSACTION_PROPERTIES =
            List.of("transaction.id", "transaction.status", "transaction.amount_in_cents");

    private static final Pattern TRANSACTION_ID = Pattern.compile("\\d+-\\d+-\\d+");
    private static final Pattern DIGITS = Pattern.compile("\\d+");

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
        HttpResponse<String> response = send(get("/transactions/" + URLEncoder.encode(id, StandardCharsets.UTF_8)));
        if (response.statusCode() == NOT_FOUND) {
            return Optional.empty();
        }
        JsonNode data = body(response).path("data");
        if (!data.isObject()) {
            throw new PaymentRejectedException("Wompi answered without data", null);
        }
        return Optional.of(transactionOf(data));
    }

    /** Not in Wompi's guides, but in its API: {@code GET /transactions?reference=} with the private key. */
    @Override
    public List<PaymentTransaction> transactions(String reference) {
        HttpResponse<String> response =
                send(get("/transactions?reference=" + URLEncoder.encode(reference, StandardCharsets.UTF_8)));
        JsonNode data = body(response).path("data");
        if (!data.isArray()) {
            throw new PaymentRejectedException("Wompi answered without a list of transactions", null);
        }
        List<PaymentTransaction> transactions = new ArrayList<>();
        data.forEach(transaction -> transactions.add(transactionOf(transaction)));
        return transactions;
    }

    /** {@code GET /merchants/info} replaced {@code GET /merchants/{public key}}, retired on 2026-10-31. */
    @Override
    public CardSetup cardSetup() {
        JsonNode data = body(send(HttpRequest.newBuilder(URI.create(baseUrl + "/merchants/info"))
                        .timeout(readTimeout)
                        .header("Accept", "application/json")
                        .header("x-merchant-public-key", keys.publicKey())
                        .GET()
                        .build()))
                .path("data");
        try {
            return new CardSetup(
                    keys.publicKey(),
                    URI.create(baseUrl + "/tokens/cards"),
                    acceptanceOf(data.path("presigned_acceptance")),
                    acceptanceOf(data.path("presigned_personal_data_auth")));
        } catch (IllegalArgumentException e) {
            throw new PaymentRejectedException("Unreadable Wompi merchant: " + e.getMessage(), e);
        }
    }

    @Override
    public PaymentSource saveCard(CardSourceRequest request) {
        Map<String, Object> source = new LinkedHashMap<>();
        source.put("type", "CARD");
        source.put("token", request.cardToken());
        source.put("customer_email", request.customerEmail());
        source.put("acceptance_token", request.acceptanceToken());
        source.put("accept_personal_auth", request.personalDataAuthToken());
        JsonNode data = body(send(post("/payment_sources", source))).path("data");
        try {
            return new PaymentSource(
                    required(data, "id"),
                    PaymentSource.Status.valueOf(required(data, "status")),
                    required(data.path("public_data"), "last_four"));
        } catch (IllegalArgumentException e) {
            throw new PaymentRejectedException("Unreadable Wompi payment source: " + e.getMessage(), e);
        }
    }

    /**
     * Wompi takes the source's id as a number and requires the integrity signature, without an expiration. Not
     * {@code recurrent}: that one is for the same amount on a schedule, and a renewal carries its overage.
     */
    @Override
    public PaymentTransaction charge(ChargeRequest request) {
        CardSetup setup = cardSetup();
        long sourceId;
        try {
            sourceId = Long.parseLong(request.sourceId());
        } catch (NumberFormatException e) {
            throw new PaymentRejectedException("A Wompi payment source id is a number", e);
        }
        Map<String, Object> transaction = new LinkedHashMap<>();
        transaction.put("amount_in_cents", request.amountCents());
        transaction.put("currency", request.currency());
        transaction.put(
                "signature",
                sha256(request.reference() + request.amountCents() + request.currency() + keys.integritySecret()));
        transaction.put("customer_email", request.customerEmail());
        transaction.put("reference", request.reference());
        transaction.put("payment_source_id", sourceId);
        transaction.put("payment_method", Map.of("installments", 1));
        transaction.put("recurrent", false);
        transaction.put("acceptance_token", setup.endUserPolicy().token());
        transaction.put("accept_personal_auth", setup.personalDataAuth().token());
        JsonNode data = body(send(post("/transactions", transaction))).path("data");
        if (!data.isObject()) {
            throw new PaymentRejectedException("Wompi answered without data", null);
        }
        return transactionOf(data);
    }

    /**
     * Refunds V2: the refund comes back decided, with Wompi's own id. A status it does not document is read as
     * PENDING, since the money may have gone back.
     */
    @Override
    public Refund refund(RefundRequest request) {
        Map<String, Object> refund = new LinkedHashMap<>();
        refund.put("transaction_id", request.transactionId());
        refund.put("amount_in_cents", request.amountCents());
        if (request.reason() != null && !request.reason().isBlank()) {
            refund.put("reason", request.reason());
        }
        refund.put("reference", request.reference());
        JsonNode data = body(send(post("/refunds", refund))).path("data");
        Refund.Status status = optional(data, "status")
                .flatMap(name -> Arrays.stream(Refund.Status.values())
                        .filter(known -> known.name().equals(name))
                        .findFirst())
                .orElse(Refund.Status.PENDING);
        return new Refund(
                optional(data, "v2_refund_id").or(() -> optional(data, "id")),
                status,
                optional(data, "status_message"));
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
        StringBuilder concatenated = new StringBuilder();
        List<String> paths = new ArrayList<>();
        Map<String, String> signed = new LinkedHashMap<>();
        JsonNode data = event.path("data");
        for (JsonNode property : properties) {
            JsonNode value = data;
            for (String step : property.asText().split("\\.")) {
                value = value.path(step);
            }
            if (!value.isValueNode()) {
                return new Invalid("signed property missing");
            }
            paths.add(property.asText());
            signed.put(property.asText(), value.asText());
            concatenated.append(value.asText());
        }
        concatenated.append(timestamp.asText()).append(keys.eventsSecret());
        if (!MessageDigest.isEqual(
                sha256(concatenated.toString()).getBytes(StandardCharsets.US_ASCII),
                checksum.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII))) {
            return new Invalid("checksum mismatch");
        }
        String environment = event.path("environment").asText("");
        if (!environment.equals(keys.environment().code())) {
            return new OtherEnvironment(environment);
        }
        // Every rearrangement of a genuine event that still verifies has its checksum, and so do Wompi's resends.
        return new Verified(new PaymentEvent(
                checksum.toLowerCase(Locale.ROOT), event.path("event").asText(""), transactionIdOf(paths, signed)));
    }

    private static Optional<String> transactionIdOf(List<String> paths, Map<String, String> signed) {
        if (!paths.equals(TRANSACTION_PROPERTIES)) {
            return Optional.empty();
        }
        String id = signed.get("transaction.id");
        boolean statusKnown = Arrays.stream(PaymentStatus.values())
                .anyMatch(status -> status.name().equals(signed.get("transaction.status")));
        return TRANSACTION_ID.matcher(id).matches()
                        && statusKnown
                        && DIGITS.matcher(signed.get("transaction.amount_in_cents"))
                                .matches()
                ? Optional.of(id)
                : Optional.empty();
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

    private HttpRequest get(String path) {
        return HttpRequest.newBuilder(URI.create(baseUrl + path))
                .timeout(readTimeout)
                .header("Accept", "application/json")
                .header("Authorization", "Bearer " + keys.privateKey())
                .GET()
                .build();
    }

    private HttpRequest post(String path, Map<String, Object> body) {
        String text;
        try {
            text = json.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("A map of strings and numbers is always JSON", e);
        }
        return HttpRequest.newBuilder(URI.create(baseUrl + path))
                .timeout(readTimeout)
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + keys.privateKey())
                .POST(HttpRequest.BodyPublishers.ofString(text, StandardCharsets.UTF_8))
                .build();
    }

    private static CardSetup.AcceptanceDocument acceptanceOf(JsonNode presigned) {
        return new CardSetup.AcceptanceDocument(
                required(presigned, "acceptance_token"), URI.create(required(presigned, "permalink")));
    }

    private JsonNode body(HttpResponse<String> response) {
        try {
            return json.readTree(response.body());
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
