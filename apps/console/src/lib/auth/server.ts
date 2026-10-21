import "@tanstack/react-start/server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { admin, jwt, organization, twoFactor } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "../db";
import { env } from "../env";
import { ac, platformRole, roles } from "./permissions";
import * as schema from "./schema";

/**
 * Better Auth owns users, organizations and memberships (schema "auth").
 * The JWT plugin mints short-lived RS256 tokens that the Java API validates through /api/auth/jwks.
 * Platform staff (admin plugin roles) must have 2FA: without it their token carries no `groups` and
 * the admin endpoints of Better Auth refuse them.
 */
export const auth = betterAuth({
  appName: "Cetus",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!ctx.path.startsWith("/admin/")) {
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
    organization(),
    admin({
      ac,
      roles,
      defaultRole: "user",
      // Staff cannot be impersonated (nor banned by the plugin's own admin check).
      adminRoles: ["admin", "support"],
      impersonationSessionDuration: 30 * 60,
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
        definePayload: ({ user, session }) => {
          const role = platformRole(user.role);
          return {
            email: user.email,
            org: session.activeOrganizationId ?? null,
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
