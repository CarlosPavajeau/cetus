import { type } from "arktype";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { symmetricDecrypt } from "better-auth/crypto";

const twoFactorRow = type({ backupCodes: "string", "verified?": "boolean | null" });

const storedCodes = type("string.json.parse").to("string[]");

/**
 * How many backup codes the signed-in person has left. The two-factor plugin stores them encrypted and
 * drops each one when it is used, but only exposes them all at once, behind the password.
 */
export function backupCodeCount(options: { total: number }) {
  return {
    id: "backup-code-count",
    endpoints: {
      countBackupCodes: createAuthEndpoint(
        "/two-factor/backup-codes/count",
        { method: "GET", use: [sessionMiddleware] },
        async (ctx) => {
          const row = await ctx.context.adapter.findOne({
            model: "twoFactor",
            where: [{ field: "userId", value: ctx.context.session.user.id }],
          });
          const twoFactor = row ? twoFactorRow.assert(row) : null;
          if (!twoFactor || twoFactor.verified === false) {
            throw new APIError("BAD_REQUEST", {
              code: "TOTP_NOT_ENABLED",
              message: "La verificación en dos pasos no está activa.",
            });
          }
          const codes = storedCodes.assert(
            await symmetricDecrypt({ key: ctx.context.secretConfig, data: twoFactor.backupCodes }),
          );
          return ctx.json({ remaining: codes.length, total: options.total });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
