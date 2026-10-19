package com.cantte.cetus.email;

/** The provider refused the message (invalid recipient, unverified domain, too large...): do not retry. */
public class EmailRejectedException extends EmailException {

    public EmailRejectedException(String message, Throwable cause) {
        super(message, cause);
    }
}
