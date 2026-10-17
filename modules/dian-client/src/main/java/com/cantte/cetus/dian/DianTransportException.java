package com.cantte.cetus.dian;

/**
 * Network problem, timeout or 5xx. The request may or may not have reached the DIAN,
 * so the caller must query the status before sending again.
 */
public class DianTransportException extends RuntimeException {

    private final boolean timeout;

    public DianTransportException(String message, boolean timeout, Throwable cause) {
        super(message, cause);
        this.timeout = timeout;
    }

    public boolean isTimeout() {
        return timeout;
    }
}
