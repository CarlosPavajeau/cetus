import { describe, expect, it } from "vite-plus/test";

import { captchaErrorMessage, signInErrorMessage, signUpError } from "~/features/auth/errors";

describe("captchaErrorMessage", () => {
  it("asks to verify again when the token is missing or refused", () => {
    for (const code of ["MISSING_RESPONSE", "VERIFICATION_FAILED"]) {
      expect(captchaErrorMessage({ status: 400, code })).toContain("Complétala de nuevo");
    }
  });

  it("asks to wait when Cloudflare did not answer", () => {
    expect(captchaErrorMessage({ status: 500, code: "UNKNOWN_ERROR" })).toContain("no respondió");
  });

  it("leaves other errors to the form", () => {
    expect(captchaErrorMessage({ status: 401, code: "INVALID_EMAIL_OR_PASSWORD" })).toBeNull();
  });

  it("reaches the sign-in and sign-up messages", () => {
    const error = { status: 403, code: "VERIFICATION_FAILED" };
    expect(signInErrorMessage(error)).toBe(captchaErrorMessage(error));
    expect(signUpError(error)).toEqual({ field: "root", message: captchaErrorMessage(error) });
  });
});
