package com.cantte.cetus.dian.simulated;

import java.util.Map;

/**
 * How the simulator answers, chosen by the identification number of the customer so an integrator can
 * reproduce every outcome on purpose. Any other number is accepted.
 */
public enum SimulatedScenario {
    ACCEPTED,
    /** Accepted with a notification (FAJ43b), as the DIAN does when the issuer's name differs from the RUT. */
    ACCEPTED_WITH_NOTIFICATIONS,
    /** Rejected with the rules of a real habilitación rejection (FAK26, FAB10a). */
    REJECTED,
    /** The first send gets no answer, though the document is registered: GetStatus finds it accepted. */
    TIMEOUT,
    /** A server fault on the first two sends, then accepted. */
    TEMPORARY_FAILURE,
    /** A credit note rejected for its correction description (CBF04); other documents are accepted. */
    CREDIT_NOTE_REJECTED;

    private static final Map<String, SimulatedScenario> BY_CUSTOMER = Map.of(
            "1000000001", ACCEPTED_WITH_NOTIFICATIONS,
            "1000000002", REJECTED,
            "1000000003", TIMEOUT,
            "1000000004", TEMPORARY_FAILURE,
            "1000000005", CREDIT_NOTE_REJECTED);

    public static SimulatedScenario of(SimulatedDocument document) {
        SimulatedScenario scenario = BY_CUSTOMER.getOrDefault(document.customerId(), ACCEPTED);
        if (scenario == CREDIT_NOTE_REJECTED && document.kind() != SimulatedDocument.Kind.CREDIT_NOTE) {
            return ACCEPTED;
        }
        return scenario;
    }
}
