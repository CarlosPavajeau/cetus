package com.cantte.cetus.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.domain.billing.Price;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class PriceTest {

    private static final BigDecimal VAT = new BigDecimal("0.19");

    /** Every final price of catalogo-planes-cetus.md, in pesos, with the base and VAT it lists. */
    @ParameterizedTest
    @CsvSource({
        "39000, 32773, 6227",
        "149000, 125210, 23790",
        "399000, 335294, 63706",
        "119000, 100000, 19000",
        "249000, 209244, 39756",
        "590000, 495798, 94202",
        "24900, 20924, 3976",
        "99900, 83950, 15950",
        "159900, 134370, 25530"
    })
    void splitsEachCatalogPriceAsTheCatalogDoes(long price, long base, long tax) {
        Price split = new Price(price * 100, true, VAT);

        assertThat(split.baseCents()).isEqualTo(base * 100);
        assertThat(split.taxCents()).isEqualTo(tax * 100);
        assertThat(split.totalCents()).isEqualTo(price * 100);
    }

    @Test
    void addsTheTaxToAPriceWithoutIt() {
        Price price = new Price(10_050, false, VAT);

        assertThat(price.baseCents()).isEqualTo(10_050);
        assertThat(price.taxCents()).isEqualTo(1_900);
        assertThat(price.totalCents()).isEqualTo(11_950);
    }

    @Test
    void anExemptPriceHasNoTax() {
        assertThat(new Price(100_00, true, BigDecimal.ZERO).taxCents()).isZero();
    }

    @Test
    void refusesANegativePriceOrARateOutsideZeroToOne() {
        assertThatThrownBy(() -> new Price(-1, true, VAT)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Price(1, true, BigDecimal.ONE)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Price(1, true, new BigDecimal("-0.01")))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
