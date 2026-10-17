package com.cantte.cetus.domain.model;

/** DIAN identification document types (schemeName in UBL). */
public enum IdentificationType {
    CIVIL_REGISTRY("11"),
    IDENTITY_CARD("12"),
    CITIZEN_ID("13"),
    FOREIGNER_CARD("21"),
    FOREIGNER_ID("22"),
    NIT("31"),
    PASSPORT("41"),
    FOREIGN_DOCUMENT("42"),
    PEP("47"),
    FOREIGN_NIT("50"),
    NUIP("91");

    private final String dianCode;

    IdentificationType(String dianCode) {
        this.dianCode = dianCode;
    }

    public String dianCode() {
        return dianCode;
    }
}
