import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import type { AuditAction } from "~/lib/api/types";

import type { AccountStatus } from "./schema";
import { getAdminAccount, listAdminAccounts, listAdminAuditLog } from "./server";

/** Prefix of everything the administration caches, for invalidating after a change. */
export const adminKey = ["admin"] as const;

export function adminAccountsQuery(filters: { status?: AccountStatus; search?: string }) {
  return infiniteQueryOptions({
    queryKey: [...adminKey, "accounts", filters],
    queryFn: ({ pageParam }) => listAdminAccounts({ data: { ...filters, before: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/** One account; null when it does not exist. */
export function adminAccountQuery(id: string) {
  return queryOptions({
    queryKey: [...adminKey, "accounts", "detail", id],
    queryFn: () => getAdminAccount({ data: { id } }),
  });
}

export function adminAuditLogQuery(filters: { accountId?: string; action?: AuditAction }) {
  return infiniteQueryOptions({
    queryKey: [...adminKey, "audit-log", filters],
    queryFn: ({ pageParam }) => listAdminAuditLog({ data: { ...filters, before: pageParam } }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
