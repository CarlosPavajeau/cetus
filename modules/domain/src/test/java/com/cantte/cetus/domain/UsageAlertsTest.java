package com.cantte.cetus.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.usage.UsageAlerts;
import org.junit.jupiter.api.Test;

class UsageAlertsTest {

    @Test
    void reachesEachShareOnItsDocument() {
        assertThat(UsageAlerts.reached(159, 200)).isEmpty();
        assertThat(UsageAlerts.reached(160, 200)).contains(80);
        assertThat(UsageAlerts.reached(199, 200)).contains(80);
        assertThat(UsageAlerts.reached(200, 200)).contains(100);
        assertThat(UsageAlerts.reached(5000, 200)).contains(100);
    }
}
