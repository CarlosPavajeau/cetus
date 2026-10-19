package com.cantte.cetus.ubl;

/** Constant values required by the DIAN in several identifiers. */
public final class DianCodes {

    public static final String AGENCY_ID = "195";
    public static final String AGENCY_NAME = "CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)";
    public static final String DIAN_NIT = "800197268";
    public static final String DIAN_CHECK_DIGIT = "4";
    public static final String UBL_VERSION = "UBL 2.1";
    public static final String INVOICE_PROFILE = "DIAN 2.1: Factura Electrónica de Venta";
    public static final String CREDIT_NOTE_PROFILE = "DIAN 2.1: Nota Crédito de Factura Electrónica de Venta";
    /** Credit note that references an electronic invoice (annex table 13.1.5.2). */
    public static final String CREDIT_NOTE_CUSTOMIZATION = "20";
    /** Literals of the AttachedDocument (annex section 6.4), the same for invoices and notes. */
    public static final String ATTACHED_CUSTOMIZATION = "Documentos adjuntos";
    public static final String ATTACHED_PROFILE = "Factura Electrónica de Venta";
    public static final String ATTACHED_DOCUMENT_TYPE = "Contenedor de Factura Electrónica";
    public static final String DIAN_VALIDATOR = "Unidad Especial Dirección de Impuestos y Aduanas Nacionales";
    /** ValidationResultCode of a document the DIAN accepted. */
    public static final String VALIDATION_ACCEPTED = "02";
    public static final String TAX_LEVEL_LIST = "48";
    public static final String DEFAULT_UNIT = "94";

    private DianCodes() {
    }
}
