package com.cantte.cetus.persistence.audit;

import java.util.List;

/** A page of audit entries, newest first. {@code nextCursor} is null on the last page. */
public record AuditPage(List<AuditEntryView> items, Long nextCursor) {
}
