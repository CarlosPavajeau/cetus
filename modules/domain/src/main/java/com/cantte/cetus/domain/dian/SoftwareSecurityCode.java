package com.cantte.cetus.domain.dian;

/** SoftwareSecurityCode = SHA-384(SoftwareID + PIN + document number). */
public final class SoftwareSecurityCode {

    private SoftwareSecurityCode() {
    }

    public static String compute(String softwareId, String pin, String documentNumber) {
        return Hashing.sha384Hex(softwareId + pin + documentNumber);
    }
}
