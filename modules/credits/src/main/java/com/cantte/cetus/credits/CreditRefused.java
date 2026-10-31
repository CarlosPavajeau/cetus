package com.cantte.cetus.credits;

/** The account may not do what it asked until it buys or extends a product (402). */
public class CreditRefused extends RuntimeException {

    public enum Reason {
        NO_ACTIVE_PRODUCT("no_active_product"),
        INSUFFICIENT_CREDITS("insufficient_credits"),
        ISSUER_LIMIT_REACHED("issuer_limit_reached");

        public final String code;

        Reason(String code) {
            this.code = code;
        }
    }

    public final Reason reason;

    public CreditRefused(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }
}
