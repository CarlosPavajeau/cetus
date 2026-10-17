package com.cantte.cetus.domain.model;

/** DIAN environment. The code is used for ProfileExecutionID and the CUFE (TipoAmbiente). */
public enum Environment {
    LIVE("1"),
    TEST("2");

    private final String dianCode;

    Environment(String dianCode) {
        this.dianCode = dianCode;
    }

    public String dianCode() {
        return dianCode;
    }
}
