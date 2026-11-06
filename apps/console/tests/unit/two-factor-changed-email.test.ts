import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { twoFactorChangedMessage } from "~/emails/TwoFactorChangedEmail";

describe("twoFactorChangedMessage", () => {
  it("says when the app changed, in Colombian time, and that backup codes still work", () => {
    const message = twoFactorChangedMessage({
      to: "persona@cetus.test",
      name: "Persona",
      changedAt: new Date("2026-10-24T20:30:00Z"),
    });
    expect(message.subject).toBe("Cambiaste la aplicación de autenticación de Cetus");
    expect(message.text).toContain("24 de octubre de 2026");
    expect(message.text).toContain("3:30");
    expect(message.text).toContain("tus códigos de respaldo siguen funcionando");
    expect(message.text).toContain("Si no fuiste tú");
    expect(renderToStaticMarkup(message.react)).toContain("Tu aplicación de autenticación cambió");
  });
});
