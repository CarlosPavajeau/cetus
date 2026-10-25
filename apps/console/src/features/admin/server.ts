import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { type } from "arktype";
import { eq, ilike, inArray } from "drizzle-orm";

import { CetusApiError, api } from "~/lib/api/client";
import type {
  AdminAccountDetail,
  AdminAccountPage,
  AdminAuditEntry,
  AdminAuditPage,
} from "~/lib/api/types";
import { auditActions } from "~/lib/api/types";
import { type PlatformRole, platformRole } from "~/lib/auth/permissions";
import { member, organization, user } from "~/lib/auth/schema";
import { auth } from "~/lib/auth/server";
import { db } from "~/lib/db";

import { accountStatuses, planChangeSchema, statusChangeSchema } from "./schema";

/**
 * Server functions are reachable by anyone with a session, so each one checks the platform role (and 2FA)
 * before reading Better Auth's tables. The API checks it again from the JWT's `groups`.
 */
export const requireStaff = createServerOnlyFn(async (only?: PlatformRole) => {
  const headers = new Headers(getRequestHeaders() as HeadersInit);
  const session = await auth.api.getSession({ headers });
  const role = platformRole(session?.user.role);
  if (
    !session ||
    !role ||
    (only && role !== only) ||
    !session.user.twoFactorEnabled ||
    session.session.impersonatedBy
  ) {
    throw new CetusApiError(403, "forbidden", "Solo para el equipo de Cetus.");
  }
  return { session, role, headers };
});

const emptyPage: AdminAccountPage = { items: [], nextCursor: null };

/** Escapes LIKE wildcards so a search for "100%" matches the text, not everything. */
function likePattern(search: string) {
  return `%${search.replaceAll(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/**
 * One page of accounts, newest first. The API does not know organization names (Better Auth owns them),
 * so a search by name finds the organizations here and asks the API for those.
 */
export const listAdminAccounts = createServerFn({ method: "GET" })
  .validator(
    type({
      "status?": type.enumerated(...accountStatuses).or("undefined"),
      "search?": "string <= 100 | undefined",
      "before?": "string.uuid | undefined",
    }),
  )
  .handler(async ({ data }): Promise<AdminAccountPage> => {
    await requireStaff();
    let organizationIds: string[] | undefined;
    const search = data.search?.trim();
    if (search) {
      const found = await db
        .select({ id: organization.id })
        .from(organization)
        .where(ilike(organization.name, likePattern(search)))
        .limit(100);
      if (found.length === 0) {
        return emptyPage;
      }
      organizationIds = found.map((row) => row.id);
    }
    return api.get("/admin/accounts", {
      params: {
        query: {
          status: data.status,
          organizationId: organizationIds,
          before: data.before,
          limit: 50,
        },
      },
    });
  });

export type AccountMember = {
  userId: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
};

export type AdminAccount = AdminAccountDetail & {
  members: AccountMember[];
  statusChangedByEmail: string | null;
};

/** One account with the members of its organization, or null when it does not exist. */
export const getAdminAccount = createServerFn({ method: "GET" })
  .validator(type({ id: "string.uuid" }))
  .handler(async ({ data }): Promise<AdminAccount | null> => {
    await requireStaff();
    let detail: AdminAccountDetail;
    try {
      detail = await api.get("/admin/accounts/{id}", { params: { path: { id: data.id } } });
    } catch (error) {
      if (error instanceof CetusApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
    const members = await db
      .select({
        userId: user.id,
        name: user.name,
        email: user.email,
        role: member.role,
        banned: user.banned,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, detail.organizationId))
      .orderBy(member.createdAt);
    const emails = await emailsOf(detail.statusChangedBy ? [detail.statusChangedBy] : []);
    return {
      ...detail,
      members: members.map((row) => ({ ...row, banned: Boolean(row.banned) })),
      statusChangedByEmail: detail.statusChangedBy
        ? (emails.get(detail.statusChangedBy) ?? null)
        : null,
    };
  });

export const suspendAccount = createServerFn({ method: "POST" })
  .validator(statusChangeSchema.and({ id: "string.uuid" }))
  .handler(async ({ data }) => {
    await requireStaff("admin");
    return api.post("/admin/accounts/{id}/suspension", {
      params: { path: { id: data.id } },
      body: { reason: data.reason },
    });
  });

export const reactivateAccount = createServerFn({ method: "POST" })
  .validator(statusChangeSchema.and({ id: "string.uuid" }))
  .handler(async ({ data }) => {
    await requireStaff("admin");
    return api.post("/admin/accounts/{id}/reactivation", {
      params: { path: { id: data.id } },
      body: { reason: data.reason },
    });
  });

export const listAdminPlans = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  return api.get("/admin/plans");
});

export const changeAccountPlan = createServerFn({ method: "POST" })
  .validator(planChangeSchema.and({ id: "string.uuid" }))
  .handler(async ({ data }) => {
    await requireStaff("admin");
    return api.put("/admin/accounts/{id}/plan", {
      params: { path: { id: data.id } },
      body: { plan: data.plan, reason: data.reason },
    });
  });

export type AdminActivityEntry = AdminAuditEntry & {
  actorEmail: string | null;
  impersonatorEmail: string | null;
};

export type AdminActivityPage = {
  items: AdminActivityEntry[];
  nextCursor: AdminAuditPage["nextCursor"];
};

/** The audit log across accounts, with the emails of the people who acted. */
export const listAdminAuditLog = createServerFn({ method: "GET" })
  .validator(
    type({
      "accountId?": "string.uuid | undefined",
      "action?": type.enumerated(...auditActions).or("undefined"),
      "before?": "number.integer > 0 | undefined",
    }),
  )
  .handler(async ({ data }): Promise<AdminActivityPage> => {
    await requireStaff();
    const page = await api.get("/admin/audit-log", {
      params: {
        query: { accountId: data.accountId, action: data.action, before: data.before, limit: 50 },
      },
    });
    const emails = await emailsOf(
      page.items
        .flatMap((entry) => [
          ...(entry.actorType === "USER" || entry.actorType === "PLATFORM" ? [entry.actorId] : []),
          entry.impersonatedBy,
        ])
        .filter((id): id is string => Boolean(id)),
    );
    return {
      items: page.items.map((entry) => ({
        ...entry,
        actorEmail: entry.actorId ? (emails.get(entry.actorId) ?? null) : null,
        impersonatorEmail: entry.impersonatedBy
          ? (emails.get(entry.impersonatedBy) ?? entry.impersonatedBy)
          : null,
      })),
      nextCursor: page.nextCursor,
    };
  });

async function emailsOf(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) {
    return new Map();
  }
  const rows = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(inArray(user.id, unique));
  return new Map(rows.map((row) => [row.id, row.email]));
}
