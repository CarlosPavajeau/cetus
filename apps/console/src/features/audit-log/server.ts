import { createServerFn } from "@tanstack/react-start";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { cetusApi } from "~/lib/api/client";
import { type AuditEntry, type AuditPage, auditActions } from "~/lib/api/types";
import { user } from "~/lib/auth/schema";
import { db } from "~/lib/db";

export type ActivityEntry = AuditEntry & { actorEmail: string | null };

export type ActivityPage = { items: ActivityEntry[]; nextCursor: number | null };

/**
 * One page of the account's audit log. The API only knows Better Auth user ids,
 * so the emails of the users on this page are resolved here.
 */
export const listAuditLog = createServerFn({ method: "GET" })
  .validator(
    z.object({
      action: z.enum(auditActions).optional(),
      before: z.number().int().positive().optional(),
    }),
  )
  .handler(async ({ data }): Promise<ActivityPage> => {
    const params = new URLSearchParams({ limit: "50" });
    if (data.action) {
      params.set("action", data.action);
    }
    if (data.before) {
      params.set("before", String(data.before));
    }
    const page = await cetusApi<AuditPage>(`/console/audit-log?${params}`);

    const userIds = [
      ...new Set(page.items.filter((entry) => entry.actorType === "USER" && entry.actorId).map((entry) => entry.actorId!)),
    ];
    const emails = new Map<string, string>();
    if (userIds.length > 0) {
      const rows = await db.select({ id: user.id, email: user.email }).from(user).where(inArray(user.id, userIds));
      for (const row of rows) {
        emails.set(row.id, row.email);
      }
    }

    return {
      items: page.items.map((entry) => ({
        ...entry,
        actorEmail: entry.actorType === "USER" && entry.actorId ? (emails.get(entry.actorId) ?? null) : null,
      })),
      nextCursor: page.nextCursor,
    };
  });
