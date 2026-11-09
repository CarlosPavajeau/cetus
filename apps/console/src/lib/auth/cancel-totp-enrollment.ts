import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, sensitiveSessionMiddleware } from "better-auth/api";

/**
 * Drops the secret that `/two-factor/enable` stored, unverified, when the person cancels before
 * confirming a code. The two-factor plugin only replaces it on the next enable; a verified one stays.
 */
export function cancelTotpEnrollment() {
  return {
    id: "cancel-totp-enrollment",
    endpoints: {
      cancelTotpEnrollment: createAuthEndpoint(
        "/two-factor/cancel-enrollment",
        { method: "POST", use: [sensitiveSessionMiddleware] },
        async (ctx) => {
          await ctx.context.adapter.deleteMany({
            model: "twoFactor",
            where: [
              { field: "userId", value: ctx.context.session.user.id },
              { field: "verified", value: false },
            ],
          });
          return ctx.json({ status: true });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
