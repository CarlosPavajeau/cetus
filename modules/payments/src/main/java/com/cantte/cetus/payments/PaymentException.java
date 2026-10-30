package com.cantte.cetus.payments;

/** Base of the errors a {@link PaymentGateway} reports. */
public abstract class PaymentException extends RuntimeException {

    protected PaymentException(String message, Throwable cause) {
        super(message, cause);
    }
}
