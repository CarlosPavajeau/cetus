import { describe, expect, it } from "vite-plus/test";

import { verificationMessage } from "~/emails/VerificationEmail";

describe("verificationMessage", () => {
  it("goes to the address it confirms and carries its link", () => {
    const url = `https://cetus.test/api/auth/verify-email?token=${crypto.randomUUID()}`;
    const message = verificationMessage({ to: "persona@cetus.test", name: "Persona", url });
    expect(message.to).toBe("persona@cetus.test");
    expect(message.subject).toBe("Confirma tu correo en Cetus");
    expect(message.text).toContain(`Confírmalo aquí: ${url}`);
  });
});
