package com.cantte.cetus.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.billing.OverageAlerts;
import org.junit.jupiter.api.Test;

class OverageAlertsTest {

    @Test
    void onlyTheHighestShareReachedIsTold() {
        assertThat(OverageAlerts.reached(389, 780)).isEmpty();
        assertThat(OverageAlerts.reached(390, 780)).contains(50);
        assertThat(OverageAlerts.reached(779, 780)).contains(50);
        assertThat(OverageAlerts.reached(780, 780)).contains(100);
    }

    @Test
    void aLimitOfZeroTellsNothing() {
        assertThat(OverageAlerts.reached(3, 0)).isEmpty();
    }
}
