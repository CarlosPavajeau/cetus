package com.cantte.cetus.worker.builders;

/**
 * Secrets opened for one document. Never logged or stored.
 *
 * @param technicalKey the range's technical key; empty for notes, whose ranges have none
 */
public record DocumentSecrets(String pin, String technicalKey) {

    @Override
    public String toString() {
        return "DocumentSecrets[redacted]";
    }
}
