import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";
import { eq } from "drizzle-orm";

import { api } from "~/lib/api/client";
import { type PlatformRole, platformRole } from "~/lib/auth/permissions";
import { member, organization, user } from "~/lib/auth/schema";
import { auth } from "~/lib/auth/server";
import { db } from "~/lib/db";

import { banSchema, statusChangeSchema } from "./schema";
import { requireStaff } from "./server";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  platformRole: PlatformRole | null;
  twoFactorEnabled: boolean;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  /** Banned and not yet expired (Better Auth lifts an expired ban at the next sign-in). */
  banActive: boolean;
  createdAt: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  twoFactorEnabled?: boolean | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | string | null;
  createdAt: Date | string;
};

function toAdminUser(row: UserRow): AdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    platformRole: platformRole(row.role),
    twoFactorEnabled: Boolean(row.twoFactorEnabled),
    banned: Boolean(row.banned),
    banReason: row.banReason ?? null,
    banExpires: row.banExpires ? new Date(row.banExpires).toISOString() : null,
    banActive: Boolean(row.banned) && (!row.banExpires || new Date(row.banExpires) > new Date()),
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export const userPageSize = 50;

/** People in Cetus, newest first, optionally those whose email contains `search`. */
export const listAdminUsers = createServerFn({ method: "GET" })
  .validator(
    type({
      "search?": "string <= 100 | undefined",
      "offset?": "number.integer >= 0 | undefined",
    }),
  )
  .handler(async ({ data }) => {
    const { headers } = await requireStaff();
    const search = data.search?.trim();
    const result = await auth.api.listUsers({
      headers,
      query: {
        limit: userPageSize,
        offset: data.offset ?? 0,
        sortBy: "createdAt",
        sortDirection: "desc",
        ...(search && { searchField: "email", searchOperator: "contains", searchValue: search }),
      },
    });
    return { users: result.users.map(toAdminUser), total: result.total };
  });

export type UserMembership = {
  organizationId: string;
  organizationName: string;
  role: string;
  /** The Cetus account of the organization; null while it has none. */
  accountId: string | null;
};

export type AdminUserDetail = AdminUser & { memberships: UserMembership[]; isSelf: boolean };

/** One person with their organizations, or null when there is no such user. */
export const getAdminUser = createServerFn({ method: "GET" })
  .validator(type({ id: "0 < string <= 64" }))
  .handler(async ({ data }): Promise<AdminUserDetail | null> => {
    const { session } = await requireStaff();
    const [row] = await db.select().from(user).where(eq(user.id, data.id));
    if (!row) {
      return null;
    }
    const memberships = await db
      .select({
        organizationId: organization.id,
        organizationName: organization.name,
        role: member.role,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, row.id))
      .orderBy(member.createdAt);
    const accounts =
      memberships.length === 0
        ? { items: [] }
        : await api.get("/admin/accounts", {
            params: {
              query: { organizationId: memberships.map((m) => m.organizationId), limit: 100 },
            },
          });
    const accountOf = new Map(
      accounts.items.map((account) => [account.organizationId, account.id]),
    );
    return {
      ...toAdminUser(row),
      memberships: memberships.map((m) => ({
        ...m,
        accountId: accountOf.get(m.organizationId) ?? null,
      })),
      isSelf: row.id === session.user.id,
    };
  });

/** The person a ban applies to: anyone but the Cetus team, the acting admin included. */
async function bannableUser(userId: string, actingUserId: string) {
  const [target] = await db
    .select({ id: user.id, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, userId));
  if (!target) {
    throw new Error("No existe ese usuario.");
  }
  if (target.id === actingUserId || platformRole(target.role)) {
    throw new Error("No se puede bloquear a un miembro del equipo de Cetus.");
  }
  return target;
}

/**
 * Records a ban or its lift in the API's audit log. Better Auth already applied it, so a failure here is
 * retried once and then reported: the change stands, but it must not go unnoticed.
 */
async function recordBanEvent(
  userId: string,
  body: { type: "BANNED" | "UNBANNED"; email: string; reason: string; expiresAt?: string | null },
) {
  const record = () =>
    api.post("/admin/users/{userId}/ban-events", { params: { path: { userId } }, body });
  try {
    await record();
  } catch {
    try {
      await record();
    } catch (error) {
      console.error("Ban applied but not audited", { userId, type: body.type, error });
      throw new Error(
        "El cambio se aplicó, pero no quedó en el registro de auditoría. Avisa al equipo técnico.",
        { cause: error },
      );
    }
  }
}

/** Bans a person from the console: Better Auth revokes their sessions, so they lose access at once. */
export const banUser = createServerFn({ method: "POST" })
  .validator(banSchema.and({ userId: "0 < string <= 64" }))
  .handler(async ({ data }) => {
    const { session, headers } = await requireStaff("admin");
    const target = await bannableUser(data.userId, session.user.id);
    const expiresIn = data.days ? data.days * 24 * 60 * 60 : undefined;
    await auth.api.banUser({
      headers,
      body: { userId: target.id, banReason: data.reason, banExpiresIn: expiresIn },
    });
    await recordBanEvent(target.id, {
      type: "BANNED",
      email: target.email,
      reason: data.reason,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
    });
  });

export const unbanUser = createServerFn({ method: "POST" })
  .validator(statusChangeSchema.and({ userId: "0 < string <= 64" }))
  .handler(async ({ data }) => {
    const { session, headers } = await requireStaff("admin");
    const target = await bannableUser(data.userId, session.user.id);
    await auth.api.unbanUser({ headers, body: { userId: target.id } });
    await recordBanEvent(target.id, { type: "UNBANNED", email: target.email, reason: data.reason });
  });
