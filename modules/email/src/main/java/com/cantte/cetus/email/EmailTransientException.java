package com.cantte.cetus.email;

/** Network error, timeout or provider failure (5xx): the email may be retried with the same idempotency key. */
public class EmailTransientException extends EmailException {

    public EmailTransientException(String message, Throwable cause) {
        super(message, cause);
    }
}
