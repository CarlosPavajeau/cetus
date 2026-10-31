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
        JOB_DEAD(true),
        DOCUMENT_STUCK(true),
        RANGE_UNVERIFIED(true),
        CERTIFICATE_EXPIRING(true),
        RANGE_RUNNING_OUT(true),
        PAYMENT_REVIEW(true),
        CREDIT_LEDGER_MISMATCH(true),
        BILLING_INVOICE_MISSING(true),
        /** Its keys carry the year: a share is reported once that year, even if the income falls under it again. */
        VAT_THRESHOLD(false);

        private final boolean forgotten;

        Category(boolean forgotten) {
            this.forgotten = forgotten;
        }

        String id() {
            return name().toLowerCase();
        }

        /** Whether an alert that cleared is forgotten, so it is reported again if it comes back. */
        boolean forgotten() {
            return forgotten;
        }
    }

    static OpsAlert of(Category category, Object id, boolean repeats, String summary) {
        return new OpsAlert(category.id() + ":" + id, category, repeats, summary);
    }
}
