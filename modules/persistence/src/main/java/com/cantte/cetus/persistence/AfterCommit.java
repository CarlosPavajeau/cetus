package com.cantte.cetus.persistence;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Status;
import jakarta.transaction.Synchronization;
import jakarta.transaction.TransactionSynchronizationRegistry;

/** Work that must happen only if the current transaction commits, such as counting what it changed. */
@ApplicationScoped
public class AfterCommit {

    @Inject
    TransactionSynchronizationRegistry transactions;

    /** Runs {@code work} once the current transaction commits; never if it rolls back. */
    public void run(Runnable work) {
        transactions.registerInterposedSynchronization(new Synchronization() {
            @Override
            public void beforeCompletion() {}

            @Override
            public void afterCompletion(int status) {
                if (status == Status.STATUS_COMMITTED) {
                    work.run();
                }
            }
        });
    }
}
