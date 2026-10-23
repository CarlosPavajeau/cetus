package com.cantte.cetus.domain.model;

/**
 * DIAN environment. The code is used for ProfileExecutionID and the CUFE (TipoAmbiente). SANDBOX never
 * reaches the DIAN: a simulator answers instead, and its documents carry the test code so their XML is
 * built exactly like a habilitación one.
 */
public enum Environment {
    LIVE("1"),
    TEST("2"),
    SANDBOX("2");

    private final String dianCode;

    Environment(String dianCode) {
        this.dianCode = dianCode;
    }

    public String dianCode() {
        return dianCode;
    }
}
