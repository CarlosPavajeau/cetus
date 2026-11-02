package com.cantte.cetus.domain.dian;

import java.util.Objects;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A validation rule the DIAN reports as text, such as "Regla: FAK26, Rechazo: …". A rejection stops the
 * document; a notification does not.
 */
public record DianRule(String code, Kind kind, String message) {

    public enum Kind {
        REJECTION,
        NOTIFICATION
    }

    private static final Pattern FORMAT = Pattern.compile(
            "^Regla:\\s*([^,]+?)\\s*,\\s*(Rechazo|Notificaci[oó]n)\\s*:\\s*(.*)$",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.DOTALL);

    public DianRule {
        Objects.requireNonNull(code);
        Objects.requireNonNull(kind);
        Objects.requireNonNull(message);
    }

    /** Empty when the text does not follow the DIAN's rule format. */
    public static Optional<DianRule> parse(String error) {
        Matcher matcher = FORMAT.matcher(error.strip());
        if (!matcher.matches()) {
            return Optional.empty();
        }
        Kind kind = matcher.group(2).regionMatches(true, 0, "Rechazo", 0, 7) ? Kind.REJECTION : Kind.NOTIFICATION;
        return Optional.of(new DianRule(matcher.group(1), kind, matcher.group(3).strip()));
    }
}
