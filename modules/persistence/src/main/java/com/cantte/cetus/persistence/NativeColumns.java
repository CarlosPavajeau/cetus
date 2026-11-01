package com.cantte.cetus.persistence;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/** Reads the values of native query rows, whose Java type depends on the driver and Hibernate version. */
public final class NativeColumns {

    private NativeColumns() {}

    public static OffsetDateTime toOffsetDateTime(Object value) {
        return switch (value) {
            case OffsetDateTime odt -> odt;
            case Instant instant -> instant.atOffset(ZoneOffset.UTC);
            case Timestamp timestamp -> timestamp.toInstant().atOffset(ZoneOffset.UTC);
            default -> throw new IllegalStateException("Unexpected timestamp type " + value.getClass());
        };
    }

    public static LocalDate toLocalDate(Object value) {
        return switch (value) {
            case LocalDate date -> date;
            case Date date -> date.toLocalDate();
            default -> throw new IllegalStateException("Unexpected date type " + value.getClass());
        };
    }
}
