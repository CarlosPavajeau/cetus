import { redirect } from "@tanstack/react-router";

import { memberPermissions } from "~/lib/auth/permissions";

import { getSession } from "./server";

/** `beforeLoad` of the protected routes: sends visitors without a session to sign in. */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw redirect({ to: "/sign-in" });
  }
  return { session };
}

/**
 * `beforeLoad` of the console: a session that belongs to the active organization. Someone without one (just
 * signed up from an invitation, or removed from it) chooses where to work first.
 */
export async function requireMembership() {
  const { session } = await requireSession();
  if (!session.activeOrganizationId || session.memberRoles.length === 0) {
    throw redirect({ to: "/organizations" });
  }
  return { session };
}

/**
 * `beforeLoad` of the setup assistant: it creates and configures issuers, which only the organization's owners
 * and admins change. Other members go back to the issuers they can read.
 */
export async function requireManager() {
  const { session } = await requireMembership();
  if (!memberPermissions(session.memberRoles).manage) {
    throw redirect({ to: "/issuers" });
  }
  return { session };
}

/**
 * `beforeLoad` of the platform administration: Cetus staff only, and only with 2FA enabled. The API
 * enforces the same rule on its side (no `groups` claim without 2FA), this guard just routes people.
 */
export async function requirePlatformStaff() {
  const { session } = await requireSession();
  if (!session.user.platformRole || session.impersonatedBy) {
    throw redirect({ to: "/overview" });
  }
  if (!session.user.twoFactorEnabled) {
    throw redirect({ to: "/settings/security", search: { required: true } });
  }
  return { session, platformRole: session.user.platformRole };
}
