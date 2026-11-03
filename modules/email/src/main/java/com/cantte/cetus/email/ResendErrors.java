package com.cantte.cetus.email;

import com.resend.core.exception.ResendException;
import java.io.IOException;

/** Turns the SDK's failures into the exceptions {@link EmailSender} and {@link ContactLists} declare. */
final class ResendErrors {

    static final int NOT_FOUND = 404;
    private static final int TOO_MANY_REQUESTS = 429;
    /** Resend's answer to two concurrent requests with the same idempotency key. */
    private static final int CONFLICT = 409;

    private ResendErrors() {}

    interface Call<T> {
        T run() throws ResendException;
    }

    static <T> T call(Call<T> call) {
        try {
            return call.run();
        } catch (ResendException e) {
            throw translate(e);
        } catch (RuntimeException e) {
            // The SDK wraps network errors and timeouts in a RuntimeException around the IOException.
            if (e.getCause() instanceof IOException) {
                throw new EmailTransientException(
                        "Resend unreachable: " + e.getCause().getMessage(), e);
            }
            throw e;
        }
    }

    static EmailException translate(ResendException e) {
        Integer status = e.getStatusCode();
        String detail = "Resend " + (status == null ? "error" : status)
                + (e.getErrorName() == null ? "" : " " + e.getErrorName()) + ": " + e.getMessage();
        if (status == null || status >= 500 || status == CONFLICT) {
            return new EmailTransientException(detail, e);
        }
        if (status == TOO_MANY_REQUESTS) {
            return new EmailRateLimited(detail, e);
        }
        return new EmailRejectedException(detail, e);
    }

    static boolean isNotFound(EmailException e) {
        return e.getCause() instanceof ResendException cause
                && cause.getStatusCode() != null
                && cause.getStatusCode() == NOT_FOUND;
    }
}
