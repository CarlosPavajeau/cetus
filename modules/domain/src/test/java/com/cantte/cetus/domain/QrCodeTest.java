package com.cantte.cetus.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.domain.calc.CalculationResult;
import com.cantte.cetus.domain.calc.InvoiceCalculator;
import com.cantte.cetus.domain.dian.QrCode;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.LineInput;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class QrCodeTest {

    private final LocalDate date = LocalDate.of(2026, 10, 20);
    private final LocalTime time = LocalTime.of(10, 30);
    private final CalculationResult calc = new InvoiceCalculator()
            .calculate(
                    List.of(new LineInput("A1", "Servicio", BigDecimal.ONE, "94", new BigDecimal("1000"), List.of())));

    @Test
    void endsWithTheDianUrl() {
        String qr = QrCode.invoice("SETP1", date, time, "900123456", "1020304050", calc, "cufe", Environment.LIVE);

        assertThat(qr).endsWith(QrCode.url(Environment.LIVE) + "cufe").contains("DocAdq: 1020304050\n");
    }

    @Test
    void aFieldCannotAddLinesOfItsOwn() {
        // Scanners open the first URL they find: one smuggled in before the DIAN's would win.
        assertThatThrownBy(() -> QrCode.invoice(
                        "SETP1", date, time, "900123456", "1\nhttps://ev.il", calc, "cufe", Environment.LIVE))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() ->
                        QrCode.note("NC1", date, time, "900123456\r", "1020304050", calc, "cude", Environment.LIVE))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
