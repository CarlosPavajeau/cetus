import "@tanstack/react-start/server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { admin, jwt, organization, twoFactor } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { and, eq } from "drizzle-orm";

import { verificationMessage } from "~/emails/VerificationEmail";

import { db } from "../db";
import { emailSender } from "../email";
import { env } from "../env";
import {
  ac,
  impersonationSeconds,
  invitationSeconds,
  organizationAc,
  organizationRoles,
  platformRole,
  roleList,
  roles,
} from "./permissions";
import * as schema from "./schema";

const adminReads = new Set([
  "/admin/list-users",
  "/admin/get-user",
  "/admin/list-user-sessions",
  "/admin/has-permission",
]);

/** While impersonating, the person's credentials, sessions and memberships stay theirs to change. */
const forbiddenWhileImpersonating = new Set([
  "/change-password",
  "/change-email",
  "/set-password",
  "/update-user",
  "/delete-user",
  "/revoke-session",
  "/revoke-sessions",
  "/revoke-other-sessions",
  "/two-factor/enable",
  "/two-factor/disable",
  "/two-factor/generate-backup-codes",
  "/organization/update",
  "/organization/delete",
  "/organization/leave",
  "/organization/invite-member",
  "/organization/cancel-invitation",
  "/organization/remove-member",
  "/organization/update-member-role",
]);

/**
 * Better Auth owns users, organizations and memberships (schema "auth").
 * The JWT plugin mints short-lived RS256 tokens that the Java API validates through /.well-known/jwks.json.
 * Platform staff (admin plugin roles) must have 2FA: without it their token carries no `groups` and
 * the admin endpoints of Better Auth refuse them.
 */
export const auth = betterAuth({
  appName: "Cetus",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  advanced: {
    ipAddress: {
      // Same source as the audit log (lib/api/client.ts): Cloudflare sets it on every request it proxies.
      ipAddressHeaders: ["cf-connecting-ip"],
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
  },
  // Only accepting an invitation asks for a verified address (requireEmailVerificationOnInvitation), so
  // whoever holds an invitation's link cannot sign up with its address and join. The link proves the
  // address and nothing else: it signs nobody in, so it never skips a second factor.
  emailVerification: {
    sendVerificationEmail: ({ user, url }) =>
      emailSender.send(verificationMessage({ to: user.email, name: user.name, url })),
    sendOnSignUp: false,
    autoSignInAfterVerification: false,
    expiresIn: 24 * 60 * 60,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (forbiddenWhileImpersonating.has(ctx.path)) {
        const session = await getSessionFromCtx(ctx);
        if (session?.session.impersonatedBy) {
          throw new APIError("FORBIDDEN", {
            code: "IMPERSONATION_FORBIDDEN",
            message: "Esta acción no está disponible mientras ves la consola como otra persona.",
          });
        }
        return;
      }
      if (!ctx.path.startsWith("/admin/")) {
        return;
      }
      // Changes go through the console's server functions, which also record them in the audit log;
      // only reads answer over HTTP. Server-side `auth.api` calls carry no request.
      if (ctx.request && !adminReads.has(ctx.path)) {
        throw new APIError("FORBIDDEN", {
          code: "USE_THE_ADMINISTRATION",
          message: "Esta acción solo se hace desde la administración de la consola.",
        });
      }
      // The impersonated person's session ends the impersonation: it is not staff, and has no 2FA.
      if (ctx.path === "/admin/stop-impersonating") {
        return;
      }
      const session = await getSessionFromCtx(ctx);
      if (session && !session.user.twoFactorEnabled) {
        throw new APIError("FORBIDDEN", {
          code: "TWO_FACTOR_REQUIRED",
          message: "Activa la verificación en dos pasos para usar la administración.",
        });
      }
    }),
  },
  plugins: [
    organization({
      ac: organizationAc,
      roles: organizationRoles,
      invitationExpiresIn: invitationSeconds,
      requireEmailVerificationOnInvitation: true,
    }),
    admin({
      ac,
      roles,
      defaultRole: "user",
      // Staff cannot be impersonated (nor banned by the plugin's own admin check).
      adminRoles: ["admin", "support"],
      impersonationSessionDuration: impersonationSeconds,
      bannedUserMessage:
        "Tu acceso a Cetus está bloqueado. Si crees que es un error, escríbenos a soporte.",
    }),
    twoFactor({ issuer: "Cetus" }),
    jwt({
      jwks: {
        keyPairConfig: { alg: "RS256", modulusLength: 2048 },
      },
      jwt: {
        issuer: env.BETTER_AUTH_URL,
        audience: "cetus-api",
        expirationTime: "5m",
        definePayload: async ({ user, session }) => {
          const role = platformRole(user.role);
          const org = session.activeOrganizationId ?? null;
          return {
            email: user.email,
            org,
            // The member's roles in the active organization (owner, admin, biller, member): the API limits some
            // changes to some of them. Read on every token, so a role change applies within one request.
            orgRoles: org ? await memberRoles(user.id, org) : [],
            // SmallRye JWT reads `groups` as the caller's roles. Only staff with 2FA get them.
            groups: role && user.twoFactorEnabled ? [role] : [],
            impersonatedBy: session.impersonatedBy ?? null,
          };
        },
      },
    }),
    // Must be last: lets server functions set auth cookies.
    tanstackStartCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;

/** The member's roles in the organization (owner, admin, member), or none outside it. */
export async function memberRoles(userId: string, organizationId: string): Promise<string[]> {
  const [membership] = await db
    .select({ role: schema.member.role })
    .from(schema.member)
    .where(and(eq(schema.member.userId, userId), eq(schema.member.organizationId, organizationId)));
  return roleList(membership?.role);
}
