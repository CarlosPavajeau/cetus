package com.cantte.cetus.domain.model;

/** Organization type (AdditionalAccountID in UBL). */
public enum PersonType {
    LEGAL_ENTITY("1"),
    NATURAL_PERSON("2");

    private final String dianCode;

    PersonType(String dianCode) {
        this.dianCode = dianCode;
    }

    public String dianCode() {
        return dianCode;
    }
}
