package com.cantte.cetus.domain.model;

/** Electronic document types supported by Cetus. */
public enum DocumentType {
    INVOICE("01", "fv"),
    CREDIT_NOTE("91", "nc"),
    DEBIT_NOTE("92", "nd");

    private final String dianCode;
    private final String filePrefix;

    DocumentType(String dianCode, String filePrefix) {
        this.dianCode = dianCode;
        this.filePrefix = filePrefix;
    }

    public String dianCode() {
        return dianCode;
    }

    /** Prefix used in DIAN file names (fv, nc, nd). */
    public String filePrefix() {
        return filePrefix;
    }
}
