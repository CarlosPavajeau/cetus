package com.cantte.cetus.payments;

import java.util.Optional;

/**
 * An authenticated event. {@code key} identifies it among the provider's events: its checksum, the same for the
 * provider's resends and for any rearrangement of the body that still verifies. {@code transactionId} is present
 * when the event signs exactly a transaction's id, status and amount. {@code type} is not signed: it only tells
 * what the event claims to be about.
 */
public record PaymentEvent(String key, String type, Optional<String> transactionId) {}
