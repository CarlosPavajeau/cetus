package com.cantte.cetus.domain.model;

/** Correction concepts of a credit note (annex table 13.2.4, cac:DiscrepancyResponse/cbc:ResponseCode). */
public enum CreditNoteConcept implements CorrectionConcept {
    PARTIAL_RETURN("1", "Devolución parcial de los bienes y/o no aceptación parcial del servicio"),
    CANCELLATION("2", "Anulación de factura electrónica"),
    REBATE("3", "Rebaja o descuento parcial o total"),
    PRICE_ADJUSTMENT("4", "Ajuste de precio"),
    EARLY_PAYMENT_DISCOUNT("5", "Descuento comercial por pronto pago"),
    VOLUME_DISCOUNT("6", "Descuento comercial por volumen de ventas");

    private final String dianCode;
    private final String dianName;

    CreditNoteConcept(String dianCode, String dianName) {
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
