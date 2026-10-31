package com.cantte.cetus.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.domain.billing.OverageLimit;
import org.junit.jupiter.api.Test;

class OverageLimitTest {

    @Test
    void theLimitBuysWholeDocumentsAtTheOveragePrice() {
        assertThat(OverageLimit.documents(11_700_000, 15_000)).isEqualTo(780);
        assertThat(OverageLimit.documents(14_999, 15_000)).isZero();
    }

    @Test
    void withoutAnOveragePriceEveryDocumentFits() {
        assertThat(OverageLimit.documents(0, 0)).isEqualTo(Integer.MAX_VALUE);
    }

    @Test
    void aNegativeAmountIsAMistake() {
        assertThatThrownBy(() -> OverageLimit.documents(-1, 15_000)).isInstanceOf(IllegalArgumentException.class);
    }
}
