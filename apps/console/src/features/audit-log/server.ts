import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";
import { inArray } from "drizzle-orm";

import { CetusApiError, api } from "~/lib/api/client";
import { type AuditEntry, type AuditPage, auditActions } from "~/lib/api/types";
import { user } from "~/lib/auth/schema";
import { db } from "~/lib/db";

export type ActivityEntry = AuditEntry & { actorEmail: string | null };

export type ActivityPage = { items: ActivityEntry[]; nextCursor: AuditPage["nextCursor"] };

/**
 * One page of the account's audit log. The API only knows Better Auth user ids,
 * so the emails of the users on this page are resolved here.
 */
export const listAuditLog = createServerFn({ method: "GET" })
  .validator(
    type({
      "action?": type.enumerated(...auditActions).or("undefined"),
      "before?": "number.integer > 0 | undefined",
    }),
  )
  .handler(async ({ data }): Promise<ActivityPage> => {
    const page = await api.get("/console/audit-log", {
      params: { query: { limit: 50, action: data.action, before: data.before } },
    });
    return { items: await withActorEmails(page.items), nextCursor: page.nextCursor };
  });

/** One entry of the account's audit log, or null when it does not exist or belongs to another account. */
export const getAuditEntry = createServerFn({ method: "GET" })
  .validator(type({ id: "number.integer > 0" }))
  .handler(async ({ data }): Promise<ActivityEntry | null> => {
    try {
      const entry = await api.get("/console/audit-log/{id}", {
        params: { path: { id: data.id } },
      });
      const [withEmail] = await withActorEmails([entry]);
      return withEmail ?? null;
    } catch (error) {
      if (error instanceof CetusApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  });

async function withActorEmails(entries: AuditEntry[]): Promise<ActivityEntry[]> {
  const userIds = [
    ...new Set(
      entries
        .filter((entry) => entry.actorType === "USER" && entry.actorId)
        .map((entry) => entry.actorId!),
    ),
  ];
  const emails = new Map<string, string>();
  if (userIds.length > 0) {
    const rows = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(inArray(user.id, userIds));
    for (const row of rows) {
      emails.set(row.id, row.email);
    }
  }

  return entries.map((entry) => ({
    ...entry,
    actorEmail:
      entry.actorType === "USER" && entry.actorId ? (emails.get(entry.actorId) ?? null) : null,
  }));
}
