package com.cantte.cetus.payments;

import java.util.Optional;

/**
 * An authenticated event. {@code key} identifies it among the provider's events (the provider resends the same
 * event with the same key); {@code transactionId} is present when the event is about a transaction.
 */
public record PaymentEvent(String key, String type, Optional<String> transactionId) {}
