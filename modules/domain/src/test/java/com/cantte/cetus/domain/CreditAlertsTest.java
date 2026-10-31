package com.cantte.cetus.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.domain.billing.CreditAlerts;
import org.junit.jupiter.api.Test;

class CreditAlertsTest {

    @Test
    void reachesEachShareOnItsCredit() {
        assertThat(CreditAlerts.reached(239, 300)).isEmpty();
        assertThat(CreditAlerts.reached(240, 300)).contains(80);
        assertThat(CreditAlerts.reached(284, 300)).contains(80);
        assertThat(CreditAlerts.reached(285, 300)).contains(95);
        assertThat(CreditAlerts.reached(300, 300)).contains(95);
    }

    @Test
    void needsCreditsGranted() {
        assertThatThrownBy(() -> CreditAlerts.reached(0, 0)).isInstanceOf(IllegalArgumentException.class);
    }
}
