package com.cantte.cetus.domain.model;

public enum DocumentStatus {
    RECEIVED,
    PROCESSING,
    SUBMITTED,
    ACCEPTED,
    REJECTED,
    FAILED;

    /** The DIAN's verdict: nothing changes it. */
    public boolean hasVerdict() {
        return this == ACCEPTED || this == REJECTED;
    }

    /**
     * Nothing will process the document again. FAILED means Cetus gave up; only a verdict the DIAN gives later
     * (to a send whose answer was lost) moves it to ACCEPTED or REJECTED.
     */
    public boolean isFinal() {
        return hasVerdict() || this == FAILED;
    }
}
