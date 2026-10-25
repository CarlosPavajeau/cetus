package com.cantte.cetus.domain.usage;

import com.cantte.cetus.domain.dian.DianTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;

/** Usage is billed by calendar month in Colombia, written as YYYY-MM. */
public final class UsagePeriod {

    private UsagePeriod() {}

    public static YearMonth of(OffsetDateTime at) {
        return YearMonth.from(at.atZoneSameInstant(DianTime.ZONE));
    }

    public static YearMonth current() {
        return of(OffsetDateTime.now());
    }

    /** The first instant of the month in Colombia. */
    public static OffsetDateTime start(YearMonth period) {
        return period.atDay(1).atStartOfDay(DianTime.ZONE).toOffsetDateTime();
    }
}
