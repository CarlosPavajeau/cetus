package com.cantte.cetus.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.cantte.cetus.domain.usage.UsagePeriod;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import org.junit.jupiter.api.Test;

class UsagePeriodTest {

    @Test
    void aMonthEndsAtMidnightInColombia() {
        assertThat(UsagePeriod.of(OffsetDateTime.parse("2026-11-01T04:59:59Z"))).isEqualTo(YearMonth.of(2026, 10));
        assertThat(UsagePeriod.of(OffsetDateTime.parse("2026-11-01T05:00:00Z"))).isEqualTo(YearMonth.of(2026, 11));
    }

    @Test
    void aMonthStartsAtMidnightInColombia() {
        assertThat(UsagePeriod.start(YearMonth.of(2026, 11)).toInstant())
                .isEqualTo(OffsetDateTime.parse("2026-11-01T05:00:00Z").toInstant());
    }
}
