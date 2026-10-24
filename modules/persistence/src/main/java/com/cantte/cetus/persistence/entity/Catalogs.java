package com.cantte.cetus.persistence.entity;

import java.util.Locale;

final class Catalogs {

    private Catalogs() {}

    /** A LIKE pattern for text anywhere in a lowercased column, with the wildcards of the text escaped. */
    static String containing(String text) {
        String escaped = text.strip()
                .toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
