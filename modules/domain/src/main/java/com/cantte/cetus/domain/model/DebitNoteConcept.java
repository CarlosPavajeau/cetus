package com.cantte.cetus.domain.model;

/** Correction concepts of a debit note (annex table 13.2.5, cac:DiscrepancyResponse/cbc:ResponseCode). */
public enum DebitNoteConcept implements CorrectionConcept {
    INTEREST("1", "Intereses"),
    EXPENSES("2", "Gastos por cobrar"),
    VALUE_CHANGE("3", "Cambio del valor"),
    OTHER("4", "Otros");

    private final String dianCode;
    private final String dianName;

    DebitNoteConcept(String dianCode, String dianName) {
        this.dianCode = dianCode;
        this.dianName = dianName;
    }

    @Override
    public String dianCode() {
        return dianCode;
    }

    @Override
    public String dianName() {
        return dianName;
    }
}
