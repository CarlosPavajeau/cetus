package com.cantte.cetus.payments;

import java.time.Instant;
import java.util.Optional;

/** A transaction as the provider reports it. {@code raw} is its JSON, kept for reconciliation and support. */
public record PaymentTransaction(
        String id,
        String reference,
        PaymentStatus status,
        long amountCents,
        String currency,
        String paymentMethodType,
        Optional<String> statusMessage,
        Instant createdAt,
        Optional<Instant> finalizedAt,
        String raw) {}
