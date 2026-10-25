package com.cantte.cetus.worker.notifications;

import java.text.NumberFormat;
import java.util.Locale;

/** Quantities and prices as the notices print them, with Colombian digit grouping. */
public final class Numbers {

    private static final Locale COLOMBIA = Locale.forLanguageTag("es-CO");

    private Numbers() {}

    /** "10.000". */
    public static String count(long value) {
        return NumberFormat.getIntegerInstance(COLOMBIA).format(value);
    }

    /** "$39.000", in Colombian pesos. */
    public static String cop(long value) {
        return "$" + count(value);
    }
}
