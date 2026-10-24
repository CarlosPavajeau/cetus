import { type } from "arktype";
import { describe, expect, it } from "vite-plus/test";

import { resetPasswordSchema } from "~/features/auth/schema";

function problems(values: { password: string; confirmPassword: string }) {
  const result = resetPasswordSchema(values);
  return result instanceof type.errors ? result.summary : "";
}

describe("resetPasswordSchema", () => {
  it("takes a password within Better Auth's limits, typed twice", () => {
    const password = "a".repeat(128);
    expect(resetPasswordSchema({ password, confirmPassword: password })).toEqual({
      password,
      confirmPassword: password,
    });
  });

  it("refuses a password Better Auth would reject for its length", () => {
    for (const password of ["a".repeat(9), "a".repeat(129)]) {
      expect(problems({ password, confirmPassword: password })).toContain(
        "La contraseña debe tener entre 10 y 128 caracteres.",
      );
    }
  });

  it("refuses a confirmation that does not match", () => {
    expect(problems({ password: "a".repeat(10), confirmPassword: "b".repeat(10) })).toContain(
      "Las contraseñas no coinciden.",
    );
  });
});
