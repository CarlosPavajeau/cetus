package com.cantte.cetus.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.domain.billing.Price;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class PriceTest {

    @Test
    void addsTheTaxRoundedHalfUpToTheCent() {
        Price price = new Price(3_900_000, new BigDecimal("0.19"));

        assertThat(price.taxCents()).isEqualTo(741_000);
        assertThat(price.totalCents()).isEqualTo(4_641_000);
        assertThat(new Price(5, new BigDecimal("0.19")).taxCents()).isEqualTo(1);
        assertThat(new Price(2, new BigDecimal("0.19")).taxCents()).isZero();
    }

    @Test
    void anExemptPriceHasNoTax() {
        assertThat(new Price(100, BigDecimal.ZERO).totalCents()).isEqualTo(100);
    }

    @Test
    void refusesANegativeAmountOrARateOutsideZeroToOne() {
        assertThatThrownBy(() -> new Price(-1, BigDecimal.ZERO)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Price(1, BigDecimal.ONE)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Price(1, new BigDecimal("-0.01"))).isInstanceOf(IllegalArgumentException.class);
    }
}
