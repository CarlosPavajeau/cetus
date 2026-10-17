package com.cantte.cetus.persistence.audit;

/** Where an audited request came from. Both values are optional. */
public record RequestOrigin(String ipAddress, String userAgent) {

    public static RequestOrigin unknown() {
        return new RequestOrigin(null, null);
    }
}
