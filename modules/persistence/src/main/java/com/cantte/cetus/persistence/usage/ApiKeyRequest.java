package com.cantte.cetus.persistence.usage;

import com.cantte.cetus.persistence.audit.RequestOrigin;

import java.time.OffsetDateTime;
import java.util.UUID;

/** One /v1 request made with an API key. {@code path} never carries the query string. */
public record ApiKeyRequest(UUID id, UUID accountId, UUID apiKeyId, String method, String path, int status,
                            int durationMs, RequestOrigin origin, OffsetDateTime createdAt) {
}
