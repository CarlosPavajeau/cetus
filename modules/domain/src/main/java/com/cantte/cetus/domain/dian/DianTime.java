package com.cantte.cetus.domain.dian;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** Colombia uses a fixed UTC-05:00 offset; DIAN times are written as HH:mm:ss-05:00. */
public final class DianTime {

    public static final ZoneId ZONE = ZoneId.of("America/Bogota");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm:ss");

    private DianTime() {
    }

    public static String time(LocalTime time) {
        return TIME.format(time) + "-05:00";
    }

    public static String date(LocalDate date) {
        return date.toString();
    }
}
