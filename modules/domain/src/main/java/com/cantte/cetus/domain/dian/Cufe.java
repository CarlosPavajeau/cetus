package com.cantte.cetus.domain.dian;

import com.cantte.cetus.domain.calc.Amounts;
import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.TaxType;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * CUFE (invoices) and CUDE (credit/debit notes) per the DIAN technical annex.
 *
 * <pre>
 * SHA-384(NumFac + FecFac + HorFac + ValFac + "01" + ValImp1 + "04" + ValImp2 + "03" + ValImp3
 *         + ValTot + NitOFE + NumAdq + Key + TipoAmbiente)
 * </pre>
 * For the CUFE the key is the technical key of the numbering range; for the CUDE it is the
 * software PIN. Validate against the examples of the current annex.
 */
public final class Cufe {

    private Cufe() {}

    public static String compute(Input input) {
        CalculationResult calc = input.calculation();
        String raw = input.documentNumber()
                + DianTime.date(input.issueDate())
                + DianTime.time(input.issueTime())
                + Amounts.format(calc.totals().lineExtensionAmount())
                + TaxType.IVA.dianCode()
                + Amounts.format(calc.taxAmount(TaxType.IVA))
                + TaxType.INC.dianCode()
                + Amounts.format(calc.taxAmount(TaxType.INC))
                + TaxType.ICA.dianCode()
                + Amounts.format(calc.taxAmount(TaxType.ICA))
                + Amounts.format(calc.totals().payableAmount())
                + input.supplierNit()
                + input.customerIdentification()
                + input.key()
                + input.environment().dianCode();
        return Hashing.sha384Hex(raw);
    }

    /**
     * @param key technical key (CUFE) or software PIN (CUDE)
     */
    public record Input(
            String documentNumber,
            LocalDate issueDate,
            LocalTime issueTime,
            CalculationResult calculation,
            String supplierNit,
            String customerIdentification,
            String key,
            Environment environment) {}
}
