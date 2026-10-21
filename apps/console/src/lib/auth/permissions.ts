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
  const assigned = (role ?? "").split(",").map((r) => r.trim());
  return platformRoles.find((r) => assigned.includes(r)) ?? null;
}
