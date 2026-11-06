import { createOTP } from "@better-auth/utils/otp";
import { type } from "arktype";
import type { BetterAuthPlugin, User } from "better-auth";
import { APIError, createAuthEndpoint, sensitiveSessionMiddleware } from "better-auth/api";
import { generateRandomString, symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";

const pendingSeconds = 10 * 60;

const twoFactorRow = type({ id: "string", "verified?": "boolean | null" });

function pendingIdentifier(userId: string) {
  return `replace-totp-${userId}`;
}

function notEnabled() {
  return new APIError("BAD_REQUEST", {
    code: "TOTP_NOT_ENABLED",
    message: "La verificación en dos pasos no está activa.",
  });
}

function expired() {
  return new APIError("BAD_REQUEST", {
    code: "REPLACEMENT_EXPIRED",
    message: "El cambio de aplicación venció. Empieza de nuevo.",
  });
}

/**
 * Links a new authenticator app while 2FA stays on: the two-factor plugin only enables or disables, and
 * disabling leaves the account on its password alone (and staff without the administration) until the
 * new app is verified. The new secret waits in `verification` and replaces the active one only after a
 * correct code from it; the backup codes and the sessions stay as they are.
 */
export function replaceTotp(options: { issuer: string; onReplaced: (user: User) => void }) {
  return {
    id: "replace-totp",
    endpoints: {
      startTotpReplacement: createAuthEndpoint(
        "/two-factor/replace-totp/start",
        {
          method: "POST",
          body: type({ password: "string" }),
          use: [sensitiveSessionMiddleware],
        },
        async (ctx) => {
          const { user } = ctx.context.session;
          const account = await ctx.context.internalAdapter.findCredentialAccount(user.id);
          if (
            !account?.password ||
            !(await ctx.context.password.verify({
              hash: account.password,
              password: ctx.body.password,
            }))
          ) {
            throw new APIError("BAD_REQUEST", {
              code: "INVALID_PASSWORD",
              message: "Invalid password",
            });
          }
          const row = await ctx.context.adapter.findOne({
            model: "twoFactor",
            where: [{ field: "userId", value: user.id }],
          });
          if (!row || twoFactorRow.assert(row).verified === false) {
            throw notEnabled();
          }
          const identifier = pendingIdentifier(user.id);
          const secret = generateRandomString(32);
          await ctx.context.internalAdapter.deleteVerificationByIdentifier(identifier);
          await ctx.context.internalAdapter.createVerificationValue({
            identifier,
            value: await symmetricEncrypt({ key: ctx.context.secretConfig, data: secret }),
            expiresAt: new Date(Date.now() + pendingSeconds * 1000),
          });
          return ctx.json({ totpURI: createOTP(secret).url(options.issuer, user.email) });
        },
      ),
      confirmTotpReplacement: createAuthEndpoint(
        "/two-factor/replace-totp/confirm",
        {
          method: "POST",
          body: type({ code: "string" }),
          use: [sensitiveSessionMiddleware],
        },
        async (ctx) => {
          const { user } = ctx.context.session;
          const identifier = pendingIdentifier(user.id);
          const pending = await ctx.context.internalAdapter.findVerificationValue(identifier);
          if (!pending || pending.expiresAt < new Date()) {
            throw expired();
          }
          const secret = await symmetricDecrypt({
            key: ctx.context.secretConfig,
            data: pending.value,
          });
          if (!(await createOTP(secret).verify(ctx.body.code))) {
            throw new APIError("BAD_REQUEST", {
              code: "INVALID_CODE",
              message: "Invalid code",
            });
          }
          const row = await ctx.context.adapter.findOne({
            model: "twoFactor",
            where: [{ field: "userId", value: user.id }],
          });
          if (!row) {
            throw notEnabled();
          }
          const { id, verified } = twoFactorRow.assert(row);
          if (verified === false) {
            throw notEnabled();
          }
          if (!(await ctx.context.internalAdapter.consumeVerificationValue(identifier))) {
            throw expired();
          }
          await ctx.context.adapter.update({
            model: "twoFactor",
            where: [{ field: "id", value: id }],
            update: { secret: pending.value },
          });
          options.onReplaced(user);
          return ctx.json({ status: true });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
