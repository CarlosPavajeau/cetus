package com.cantte.cetus.worker.runner;

/** The job can never succeed as is (e.g. the DIAN rejects the request itself): mark it dead, no retries. */
public class GiveUp extends RuntimeException {

    public GiveUp(String reason) {
        super(reason);
    }

    public GiveUp(String reason, Throwable cause) {
        super(reason, cause);
    }
}
