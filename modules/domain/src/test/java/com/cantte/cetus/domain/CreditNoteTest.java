package com.cantte.cetus.domain;

import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.dian.QrCode;
import com.cantte.cetus.domain.model.CreditNoteConcept;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.domain.model.TaxType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CreditNoteTest {

    @Test
    void conceptsUseTheCodesOfAnnexTable1324() {
        assertThat(Arrays.stream(CreditNoteConcept.values()).map(CreditNoteConcept::dianCode))
                .containsExactly("1", "2", "3", "4", "5", "6");
        assertThat(CreditNoteConcept.CANCELLATION.dianName()).isEqualTo("Anulación de factura electrónica");
    }

    @Test
    void theQrOfACreditNoteCarriesItsCude() {
        var calc = new InvoiceCalculator().calculate(List.of(new LineInput("A1", "Consultoría", BigDecimal.ONE, "94",
                new BigDecimal("100000"), List.of(new LineInput.LineTax(TaxType.IVA, new BigDecimal("19"))))));

        String qr = QrCode.creditNote("NC1", LocalDate.of(2026, 10, 18), LocalTime.of(9, 15), "900123456",
                "1020304050", calc, "cude-value", Environment.TEST);

        assertThat(qr).contains("NumFac: NC1\n", "ValTolFac: 119000.00\n", "CUDE: cude-value\n")
                .doesNotContain("CUFE")
                .endsWith("https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=cude-value");
    }
}
