package com.cantte.cetus.domain.dian;

import com.cantte.cetus.domain.calc.Amounts;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.TaxType;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Content of the QR code (sts:QRCode and the printed representation).
 * Recent annex versions simplify this content; confirm the expected format before production.
 */
public final class QrCode {

    private static final String LIVE_URL = "https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=";
    private static final String TEST_URL = "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=";

    private QrCode() {}

    public static String invoice(
            String number,
            LocalDate date,
            LocalTime time,
            String supplierNit,
            String customerId,
            CalculationResult calc,
            String cufe,
            Environment env) {
        return content(number, date, time, supplierNit, customerId, calc, "CUFE", cufe, env);
    }

    /** QR of a credit or debit note, which carries its CUDE. */
    public static String note(
            String number,
            LocalDate date,
            LocalTime time,
            String supplierNit,
            String customerId,
            CalculationResult calc,
            String cude,
            Environment env) {
        return content(number, date, time, supplierNit, customerId, calc, "CUDE", cude, env);
    }

    private static String content(
            String number,
            LocalDate date,
            LocalTime time,
            String supplierNit,
            String customerId,
            CalculationResult calc,
            String keyName,
            String key,
            Environment env) {
        for (String field : new String[] {number, supplierNit, customerId, key}) {
            if (field.indexOf('\n') >= 0 || field.indexOf('\r') >= 0) {
                // Each field is one line of the QR: a line break would let it add lines (or URLs) of its own.
                throw new IllegalArgumentException("QR fields cannot contain line breaks");
            }
        }
        var otherTaxes = calc.taxAmount(TaxType.INC).add(calc.taxAmount(TaxType.ICA));
        return "NumFac: " + number + "\n"
                + "FecFac: " + DianTime.date(date) + "\n"
                + "HorFac: " + DianTime.time(time) + "\n"
                + "NitFac: " + supplierNit + "\n"
                + "DocAdq: " + customerId + "\n"
                + "ValFac: " + Amounts.format(calc.totals().lineExtensionAmount()) + "\n"
                + "ValIva: " + Amounts.format(calc.taxAmount(TaxType.IVA)) + "\n"
                + "ValOtroIm: " + Amounts.format(otherTaxes) + "\n"
                + "ValTolFac: " + Amounts.format(calc.totals().payableAmount()) + "\n"
                + keyName + ": " + key + "\n"
                + url(env) + key;
    }

    public static String url(Environment env) {
        return env == Environment.LIVE ? LIVE_URL : TEST_URL;
    }
}
