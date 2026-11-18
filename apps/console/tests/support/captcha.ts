import type { Page } from "@playwright/test";

/** The token Cloudflare's test secret key accepts, for calls to Better Auth that skip the forms. */
export const captchaHeaders = { "x-captcha-response": "XXXX.DUMMY.TOKEN.XXXX" };

/** Waits for the form's Turnstile widget, on Cloudflare's always-passing test site key, to hand out a token. */
export async function captchaSolved(page: Page) {
  await page.locator('[data-captcha="solved"]').waitFor();
}
