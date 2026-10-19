package com.cantte.cetus.email;

/** Base of the errors an {@link EmailSender} reports. */
public abstract class EmailException extends RuntimeException {

    protected EmailException(String message, Throwable cause) {
        super(message, cause);
    }
}
