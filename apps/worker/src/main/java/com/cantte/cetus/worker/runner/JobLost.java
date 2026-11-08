package com.cantte.cetus.worker.runner;

/** The run no longer holds its job: another worker claimed it after the lease expired. */
public class JobLost extends RuntimeException {

    public JobLost() {
        super("The job's lease expired and another run claimed it");
    }
}
