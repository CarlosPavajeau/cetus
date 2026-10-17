package com.cantte.cetus.domain.dian;

import com.cantte.cetus.domain.model.DocumentType;

/**
 * File naming convention for documents sent to the DIAN:
 * {type}{NIT 10 digits}{provider code 3}{year 2}{sequence 8 hex}.xml and "z..." for the zip.
 *
 * @see #xml(DocumentType, String, String, int, long)
 */
public final class DianFileNames {

    /** Provider code when the issuer uses its own software. */
    public static final String OWN_SOFTWARE_CODE = "000";

    private DianFileNames() {
    }

    public static String xml(DocumentType type, String nit, String providerCode, int year, long sequence) {
        return type.filePrefix() + base(nit, providerCode, year, sequence) + ".xml";
    }

    public static String zip(String nit, String providerCode, int year, long sequence) {
        return "z" + base(nit, providerCode, year, sequence) + ".zip";
    }

    private static String base(String nit, String providerCode, int year, long sequence) {
        return String.format("%010d", Long.parseLong(nit))
                + providerCode
                + String.format("%02d", year % 100)
                + String.format("%08x", sequence);
    }
}
