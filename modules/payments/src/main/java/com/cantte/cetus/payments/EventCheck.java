package com.cantte.cetus.payments;

/** The outcome of checking an event received from the provider. */
public sealed interface EventCheck {

    /** Signed with the events secret of this environment. */
    record Verified(PaymentEvent event) implements EventCheck {}

    /** Correctly signed, but for the provider's other environment (sandbox or production). */
    record OtherEnvironment(String environment) implements EventCheck {}

    /** Not signed with the events secret, or not an event at all. */
    record Invalid(String reason) implements EventCheck {}
}
