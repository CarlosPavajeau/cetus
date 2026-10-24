package com.cantte.cetus.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.dian.NitCheckDigit;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.domain.model.TaxType;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class InvoiceCalculatorTest {

    private final InvoiceCalculator calculator = new InvoiceCalculator();

    @Test
    void computesTotalsWithMixedTaxes() {
        var lines = List.of(
                new LineInput(
                        "A1",
                        "Consultoría",
                        new BigDecimal("2"),
                        "94",
                        new BigDecimal("100000"),
                        List.of(new LineInput.LineTax(TaxType.IVA, new BigDecimal("19")))),
                new LineInput("B1", "Libro", new BigDecimal("1"), "94", new BigDecimal("50000"), List.of()));

        var result = calculator.calculate(lines);

        assertThat(result.totals().lineExtensionAmount()).isEqualByComparingTo("250000.00");
        assertThat(result.totals().taxExclusiveAmount()).isEqualByComparingTo("200000.00");
        assertThat(result.taxAmount(TaxType.IVA)).isEqualByComparingTo("38000.00");
        assertThat(result.totals().payableAmount()).isEqualByComparingTo("288000.00");
    }

    @Test
    void rejectsEmptyDocuments() {
        assertThatThrownBy(() -> calculator.calculate(List.of())).isInstanceOf(DomainException.class);
    }

    @Test
    void rejectsTotalsTheDatabaseCannotStore() {
        var lines = List.of(new LineInput(
                "A1",
                "Consultoría",
                new BigDecimal("99999999999999"),
                "94",
                new BigDecimal("99999999999999"),
                List.of()));

        assertThatThrownBy(() -> calculator.calculate(lines))
                .isInstanceOf(DomainException.class)
                .extracting(e -> ((DomainException) e).code())
                .isEqualTo("amount_too_large");
    }

    @Test
    void computesNitCheckDigit() {
        // DIAN's own NIT: 800197268-4
        assertThat(NitCheckDigit.compute("800197268")).isEqualTo("4");
    }
}
