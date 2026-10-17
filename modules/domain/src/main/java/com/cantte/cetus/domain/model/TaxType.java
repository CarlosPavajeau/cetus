package com.cantte.cetus.domain.model;

/** Taxes that participate in the CUFE. Withholdings will be modelled separately. */
public enum TaxType {
    IVA("01", "IVA"),
    ICA("03", "ICA"),
    INC("04", "INC");

    private final String dianCode;
    private final String dianName;

    TaxType(String dianCode, String dianName) {
        this.dianCode = dianCode;
        this.dianName = dianName;
    }

    public String dianCode() {
        return dianCode;
    }

    public String dianName() {
        return dianName;
    }
}
