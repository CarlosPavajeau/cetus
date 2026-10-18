import "@tanstack/react-start/server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { jwt, organization } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "../db";
import { env } from "../env";
import * as schema from "./schema";

/**
 * Better Auth owns users, organizations and memberships (schema "auth").
 * The JWT plugin mints short-lived RS256 tokens that the Java API validates through /api/auth/jwks.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
  },
  plugins: [
    organization(),
    jwt({
      jwks: {
        keyPairConfig: { alg: "RS256", modulusLength: 2048 },
      },
      jwt: {
        issuer: env.BETTER_AUTH_URL,
        audience: "cetus-api",
        expirationTime: "5m",
        definePayload: ({ user, session }) => ({
          email: user.email,
          org: session.activeOrganizationId ?? null,
        }),
      },
    }),
    // Must be last: lets server functions set auth cookies.
    tanstackStartCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
