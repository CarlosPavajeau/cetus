import { type ParsedLocation, redirect } from "@tanstack/react-router";

import { memberPermissions } from "~/lib/auth/permissions";

import { getSession } from "./server";

/**
 * `beforeLoad` of the protected routes: sends visitors without a session to sign in, and people who have not
 * accepted the current legal documents to accept them first. Staff seeing the console as someone else go on:
 * accepting is the person's to do.
 */
export async function requireSession({ location }: { location: ParsedLocation }) {
  const session = await getSession();
  if (!session) {
    throw redirect({ to: "/sign-in" });
  }
  if (session.pendingConsents.length > 0 && !session.impersonatedBy) {
    throw redirect({ to: "/legal/accept", search: { redirect: location.href } });
  }
  return { session };
}

/**
 * `beforeLoad` of the console: a session that belongs to the active organization. Someone without one (just
 * signed up from an invitation, or removed from it) chooses where to work first.
 */
export async function requireMembership(match: { location: ParsedLocation }) {
  const { session } = await requireSession(match);
  if (!session.activeOrganizationId || session.memberRoles.length === 0) {
    throw redirect({ to: "/organizations" });
  }
  return { session };
}

/**
 * `beforeLoad` of the setup assistant: it creates and configures issuers, which only the organization's owners
 * and admins change. Other members go back to the issuers they can read.
 */
export async function requireManager(match: { location: ParsedLocation }) {
  const { session } = await requireMembership(match);
  if (!memberPermissions(session.memberRoles).manage) {
    throw redirect({ to: "/issuers" });
  }
  return { session };
}

/**
 * `beforeLoad` of the platform administration: Cetus staff only, and only with 2FA enabled. The API
 * enforces the same rule on its side (no `groups` claim without 2FA), this guard just routes people.
 */
export async function requirePlatformStaff(match: { location: ParsedLocation }) {
  const { session } = await requireSession(match);
  if (!session.user.platformRole || session.impersonatedBy) {
    throw redirect({ to: "/overview" });
  }
  if (!session.user.twoFactorEnabled) {
    throw redirect({ to: "/settings/security", search: { required: true } });
  }
  return { session, platformRole: session.user.platformRole };
}
