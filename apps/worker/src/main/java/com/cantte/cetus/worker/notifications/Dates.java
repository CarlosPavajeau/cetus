package com.cantte.cetus.worker.notifications;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Dates as the notices print them: Bogotá's time, day first. */
public final class Dates {

    public static final ZoneId BOGOTA = ZoneId.of("America/Bogota");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter MOMENT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter MONTH =
            DateTimeFormatter.ofPattern("MMMM 'de' yyyy", Locale.forLanguageTag("es-CO"));

    private Dates() {}

    public static String bogota(OffsetDateTime moment) {
        return moment.atZoneSameInstant(BOGOTA).format(MOMENT);
    }

    public static String day(LocalDate date) {
        return date.format(DAY);
    }

    /** "octubre de 2026". */
    public static String month(YearMonth month) {
        return month.format(MONTH);
    }
}
