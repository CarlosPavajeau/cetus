package com.cantte.cetus.domain.calc;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Rounding and formatting rules for monetary values sent to the DIAN. */
public final class Amounts {

    public static final int SCALE = 2;

    private Amounts() {
    }

    public static BigDecimal round(BigDecimal value) {
        return value.setScale(SCALE, RoundingMode.HALF_UP);
    }

    /** Plain string with two decimals and a dot separator, as used in the CUFE. */
    public static String format(BigDecimal value) {
        return round(value).toPlainString();
    }
}
