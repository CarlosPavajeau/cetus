package com.cantte.cetus.worker.ops;

/**
 * A condition the operators must know about.
 *
 * @param key      identifies the condition across runs: "{category}:{id}"
 * @param repeats  whether it is emailed again (once a day) while it persists; a dead job is reported once
 * @param summary  one line for the email
 */
public record OpsAlert(String key, Category category, boolean repeats, String summary) {

    public enum Category {
        JOB_DEAD,
        DOCUMENT_STUCK,
        RANGE_UNVERIFIED,
        CERTIFICATE_EXPIRING,
        RANGE_RUNNING_OUT;

        String id() {
            return name().toLowerCase();
        }
    }

    static OpsAlert of(Category category, Object id, boolean repeats, String summary) {
        return new OpsAlert(category.id() + ":" + id, category, repeats, summary);
    }
}
