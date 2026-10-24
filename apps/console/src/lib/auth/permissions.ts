import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Platform roles (the Cetus team), stored in `auth.user.role`. They are unrelated to the organization
 * member roles. `support` reads and assists; only `admin` bans users, suspends accounts or impersonates.
 */
export const ac = createAccessControl(defaultStatements);

export const roles = {
  user: ac.newRole({ user: [], session: [] }),
  support: ac.newRole({ user: ["list", "get"], session: ["list"] }),
  admin: ac.newRole(adminAc.statements),
};

export const platformRoles = ["admin", "support"] as const;
export type PlatformRole = (typeof platformRoles)[number];

/** The strongest platform role in a Better Auth role string ("admin,support" → "admin"), or null. */
export function platformRole(role: string | null | undefined): PlatformRole | null {
  const assigned = roleList(role);
  return platformRoles.find((r) => assigned.includes(r)) ?? null;
}

/** The roles in a Better Auth role string ("owner,admin" → ["owner", "admin"]). */
export function roleList(role: string | null | undefined): string[] {
  return (role ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
}

/**
 * Organization member roles (`auth.member.role`, unrelated to the platform roles) that may change the
 * account's contacts, API keys, webhooks and issuers. The API checks the same list against the token's
 * `orgRoles` (OrganizationRoleFilter).
 */
export const managerRoles = ["owner", "admin"];

/**
 * Organization member roles that may issue LIVE documents from the console: a real fiscal document, only
 * corrected with another one. The API checks the same list; SANDBOX and TEST are open to every member.
 */
export const liveIssuerRoles = ["owner", "admin"];

export type MemberPermissions = {
  /** Changes the contacts, the API keys, the webhooks and the issuers. */
  manage: boolean;
  /** Issues LIVE documents. */
  issueLive: boolean;
};

export function memberPermissions(assigned: string[]): MemberPermissions {
  return {
    manage: assigned.some((role) => managerRoles.includes(role)),
    issueLive: assigned.some((role) => liveIssuerRoles.includes(role)),
  };
}

/** How long a Cetus admin can act as a console user before signing in again. */
export const impersonationSeconds = 30 * 60;
