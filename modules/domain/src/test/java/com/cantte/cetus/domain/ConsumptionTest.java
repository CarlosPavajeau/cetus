package com.cantte.cetus.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.domain.billing.Consumption;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ConsumptionTest {

    @ParameterizedTest
    @CsvSource({
        "11900000, 0, 300, 0",
        "11900000, 300, 300, 11900000",
        "11900000, 100, 300, 3966700",
        "11900000, 1, 300, 39700",
        "3900000, 125, 250, 1950000",
        "0, 10, 10, 0"
    })
    void isTheConsumedShareRoundedToThePeso(long totalCents, int consumed, int quantity, long valueCents) {
        assertThat(Consumption.valueCents(totalCents, consumed, quantity)).isEqualTo(valueCents);
    }

    @ParameterizedTest
    @CsvSource({"100, -1, 10", "100, 11, 10", "100, 0, 0", "-1, 0, 10"})
    void refusesWhatIsNotAConsumption(long totalCents, int consumed, int quantity) {
        assertThatThrownBy(() -> Consumption.valueCents(totalCents, consumed, quantity))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
