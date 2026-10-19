package com.cantte.cetus.email;

/** The provider answered 429: the email was not sent and can be retried later. */
public class EmailRateLimited extends EmailException {

    public EmailRateLimited(String message, Throwable cause) {
        super(message, cause);
    }
}
