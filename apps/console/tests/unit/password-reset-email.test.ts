import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { passwordChangedMessage } from "~/emails/PasswordChangedEmail";
import { passwordResetMessage } from "~/emails/PasswordResetEmail";

describe("passwordResetMessage", () => {
  it("goes to the account's address and carries its link", () => {
    const url = `https://cetus.test/api/auth/reset-password/${crypto.randomUUID()}?callbackURL=%2Freset-password`;
    const message = passwordResetMessage({ to: "persona@cetus.test", name: "Persona", url });
    expect(message.to).toBe("persona@cetus.test");
    expect(message.subject).toBe("Recupera tu contraseña de Cetus");
    expect(message.text).toContain(`Elige una contraseña nueva aquí: ${url}`);
    expect(message.text).toContain("vence en 1 hora");
    const html = renderToStaticMarkup(message.react);
    expect(html).toContain("Elegir una contraseña nueva");
    expect(html).toContain(`href="${url.replaceAll("&", "&amp;")}"`);
  });
});

describe("passwordChangedMessage", () => {
  it("says when the password changed, in Colombian time", () => {
    const message = passwordChangedMessage({
      to: "persona@cetus.test",
      name: "Persona",
      changedAt: new Date("2026-10-24T20:30:00Z"),
    });
    expect(message.subject).toBe("Tu contraseña de Cetus cambió");
    expect(message.text).toContain("24 de octubre de 2026");
    expect(message.text).toContain("3:30");
    expect(message.text).toContain("Si no fuiste tú");
    expect(renderToStaticMarkup(message.react)).toContain("Tu contraseña cambió");
  });
});
