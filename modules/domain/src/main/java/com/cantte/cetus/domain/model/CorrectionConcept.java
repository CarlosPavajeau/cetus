package com.cantte.cetus.domain.model;

/** Why a note corrects an invoice: the code and name of cac:DiscrepancyResponse for its document type. */
public interface CorrectionConcept {

    String dianCode();

    /** The concept's name in the annex table, which the DIAN expects in DiscrepancyResponse/Description. */
    String dianName();

    /** The concept stored for a note of the type, or null for an invoice. */
    static CorrectionConcept of(DocumentType type, String name) {
        if (name == null) {
            return null;
        }
        return switch (type) {
            case CREDIT_NOTE -> CreditNoteConcept.valueOf(name);
            case DEBIT_NOTE -> DebitNoteConcept.valueOf(name);
            case INVOICE -> throw new IllegalArgumentException("Invoices have no correction concept");
        };
    }
}
