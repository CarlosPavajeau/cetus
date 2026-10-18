import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import type { AuditAction } from "~/lib/api/types";

import { getAuditEntry, listAuditLog } from "./server";

/** Prefix shared by every filter, for invalidating the whole log after a change that writes to it. */
export const auditLogKey = ["audit-log"] as const;

/** The audit log for one filter; each page continues from the previous page's cursor. */
export function auditLogQuery(action: AuditAction | undefined) {
  return infiniteQueryOptions({
    queryKey: [...auditLogKey, { action }],
    queryFn: ({ pageParam }) => listAuditLog({ data: { action, before: pageParam } }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/** One entry by id; null when the account has no such entry. */
export function auditEntryQuery(id: number) {
  return queryOptions({
    queryKey: [...auditLogKey, "entry", id],
    queryFn: () => getAuditEntry({ data: { id } }),
  });
}
