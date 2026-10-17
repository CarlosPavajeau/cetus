package com.cantte.cetus.domain.model;

public enum DocumentStatus {
    RECEIVED,
    PROCESSING,
    SUBMITTED,
    ACCEPTED,
    REJECTED,
    FAILED;

    public boolean isFinal() {
        return this == ACCEPTED || this == REJECTED;
    }
}
