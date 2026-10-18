package com.cantte.cetus.persistence.usage;

import java.time.OffsetDateTime;
import java.util.UUID;

/** A recorded request as shown to the account owner. The IP address and user agent are stored but not exposed. */
public record ApiKeyRequestView(UUID id, String method, String path, int status, int durationMs,
                                OffsetDateTime createdAt) {
}
