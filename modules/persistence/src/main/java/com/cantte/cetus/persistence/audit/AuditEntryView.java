package com.cantte.cetus.persistence.audit;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/** One audit log row. The user agent is stored but not exposed. */
public record AuditEntryView(long id, UUID accountId, AuditAction action, Actor.ActorType actorType, String actorId,
                             String resourceType, UUID resourceId, Map<String, Object> data,
                             String ipAddress, OffsetDateTime createdAt) {
}
