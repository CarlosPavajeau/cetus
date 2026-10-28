package com.cantte.cetus.worker.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.model.TaxType;
import com.cantte.cetus.persistence.entity.DocumentEntity;
import com.cantte.cetus.persistence.entity.DocumentLineEntity;
import com.cantte.cetus.persistence.entity.DocumentTaxEntity;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ContextCalculationTest {
    @Test
    void groupsLineTaxesWithoutChangingOrderOrStoredTotals() {
        var doc = new DocumentEntity();
        var first = line(1);
        var second = line(2);
        var untaxed = line(3);
        doc.lines.addAll(List.of(first, second, untaxed));
        doc.taxes.addAll(List.of(
                tax(second, TaxType.IVA, 19, 7),
                tax(first, TaxType.IVA, 5, 2),
                tax(first, TaxType.INC, 8, 3),
                tax(null, TaxType.IVA, 19, 7),
                tax(null, TaxType.IVA, 5, 2)));
        doc.payableAmount = BigDecimal.valueOf(987654);
        var result = ContextLoader.calculation(doc);
        assertThat(result.lines()).extracting(l -> l.number()).containsExactly(1, 2, 3);
        assertThat(result.lines().getFirst().taxes())
                .extracting(t -> t.type())
                .containsExactly(TaxType.IVA, TaxType.INC);
        assertThat(result.lines().get(1).taxes()).extracting(t -> t.amount()).containsExactly(BigDecimal.valueOf(7));
        assertThat(result.lines().get(2).taxes()).isEmpty();
        assertThat(result.taxTotals()).singleElement().satisfies(total -> {
            assertThat(total.amount()).isEqualByComparingTo("9");
            assertThat(total.subtotals())
                    .extracting(t -> t.percent())
                    .containsExactly(BigDecimal.valueOf(5), BigDecimal.valueOf(19));
        });
        assertThat(result.totals().payableAmount()).isEqualTo(doc.payableAmount);
    }

    private static DocumentLineEntity line(int number) {
        var line = new DocumentLineEntity();
        line.id = UUID.randomUUID();
        line.lineNumber = number;
        return line;
    }

    private static DocumentTaxEntity tax(DocumentLineEntity line, TaxType type, int percent, int amount) {
        var tax = new DocumentTaxEntity();
        tax.line = line;
        tax.taxType = type;
        tax.percent = BigDecimal.valueOf(percent);
        tax.taxableAmount = BigDecimal.TEN;
        tax.taxAmount = BigDecimal.valueOf(amount);
        return tax;
    }
}
