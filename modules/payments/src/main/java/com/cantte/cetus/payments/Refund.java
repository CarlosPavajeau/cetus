package com.cantte.cetus.payments;

import java.util.Optional;

/**
 * A refund as the provider answered it.
 *
 * @param id the provider's id; empty when its answer had none
 */
public record Refund(Optional<String> id, Status status, Optional<String> message) {

    public enum Status {
        /** Not decided yet, or answered in a way that cannot be read: the money may or may not go back. */
        PENDING,
        APPROVED,
        DECLINED,
        ERROR,
        CANCELLED;

        /** The money did not go back and will not. */
        public boolean isFailed() {
            return this == DECLINED || this == ERROR || this == CANCELLED;
        }
    }
}
