package com.cantte.cetus.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.domain.billing.VatThreshold;
import java.util.List;
import org.junit.jupiter.api.Test;

class VatThresholdTest {

    private final VatThreshold threshold = new VatThreshold(50_000, 3_500, List.of(90, 70));

    @Test
    void theLimitIsTheThresholdInUvtTimesItsValue() {
        assertThat(threshold.limitCents()).isEqualTo(175_000_000_00L);
    }

    @Test
    void reachesOnlyTheHighestShare() {
        assertThat(threshold.reached(122_499_999_99L)).isEmpty();
        assertThat(threshold.reached(122_500_000_00L)).contains(70);
        assertThat(threshold.reached(157_500_000_00L)).contains(90);
        assertThat(threshold.reached(200_000_000_00L)).contains(90);
    }

    @Test
    void crossesEveryShareBelowTheIncome() {
        assertThat(threshold.crossed(122_499_999_99L)).isEmpty();
        assertThat(threshold.crossed(122_500_000_00L)).containsExactly(70);
        assertThat(threshold.crossed(200_000_000_00L)).containsExactly(70, 90);
    }

    @Test
    void refusesValuesThatCannotBeAThreshold() {
        assertThatThrownBy(() -> new VatThreshold(0, 3_500, List.of(70))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new VatThreshold(50_000, 3_500, List.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new VatThreshold(50_000, 3_500, List.of(120)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
