import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { type } from "arktype";

import { auth } from "~/lib/auth/server";

/**
 * Whether a sign-in is waiting for its second factor. Better Auth keeps it in an httpOnly cookie that lives
 * as long as the pending verification, so the browser cannot see it.
 */
export const hasPendingTwoFactor = createServerFn({ method: "GET" }).handler(async () => {
  const context = await auth.$context;
  return Boolean(getCookie(context.createAuthCookie("two_factor").name));
});

/** Whether a password reset link can still be used. POST: the token is a credential and stays out of URLs. */
export const isResetTokenValid = createServerFn({ method: "POST" })
  .validator(type({ token: "0 < string <= 128" }))
  .handler(async ({ data }) => {
    const context = await auth.$context;
    const verification = await context.internalAdapter.findVerificationValue(
      `reset-password:${data.token}`,
    );
    return Boolean(verification && verification.expiresAt > new Date());
  });
