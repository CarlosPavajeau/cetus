package com.cantte.cetus.payments;

import java.util.Optional;

/**
 * An authenticated event. {@code key} identifies it among the provider's events from its signed values (the
 * provider resends the same event with the same key); {@code transactionId} is present when the transaction's id
 * is one of them. {@code type} is not signed: it only tells what the event claims to be about.
 */
public record PaymentEvent(String key, String type, Optional<String> transactionId) {}
