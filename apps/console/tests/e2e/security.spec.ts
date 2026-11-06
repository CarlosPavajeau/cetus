import { type } from "arktype";

import { totp } from "../support/platform-staff";
import { expect, open, test } from "./fixtures";

test("2FA is enabled from the security page and then asked at sign-in", async ({
  page,
  organization,
}) => {
  await open(page, "/settings/security");
  await page.getByRole("textbox", { name: "Contraseña" }).fill(organization.password);
  await page.getByRole("button", { name: "Activar verificación en dos pasos" }).click();

  await expect(page.getByRole("img", { name: "Código QR de la verificación" })).toBeVisible();
  const secret = (await page.locator("code").first().textContent()) ?? "";
  await page.getByLabel("Código de verificación").fill(totp(secret));
  await page.getByRole("button", { name: "Verificar y activar" }).click();

  await expect(page.getByText("Guarda tus códigos de respaldo")).toBeVisible();
  await expect(page.getByText("2FA activa")).toBeVisible();

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL("**/sign-in");
  await page.getByLabel("Correo electrónico").fill(organization.email);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(organization.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await page.waitForURL("**/two-factor");
  await expect(page.getByLabel("Código de verificación")).toBeFocused();
  await page.keyboard.type("000000");
  await expect(page.getByText("El código no es válido")).toBeVisible();

  await page.getByLabel("Código de verificación").fill(totp(secret));
  await page.waitForURL((url) => !/sign-in|two-factor/.test(url.pathname));
});

test("a backup code typed as shown, dash included, signs in", async ({ browser, organization }) => {
  const { totpURI, backupCodes } = type({ totpURI: "string", backupCodes: "string[]" }).assert(
    await organization.auth("/two-factor/enable", { password: organization.password }),
  );
  const secret = new URL(totpURI).searchParams.get("secret") ?? "";
  await organization.auth("/two-factor/verify-totp", { code: totp(secret) });
  const [backupCode] = backupCodes;
  expect(backupCode).toMatch(/^[a-zA-Z0-9]{5}-[a-zA-Z0-9]{5}$/);

  const visitor = await browser.newContext();
  const page = await visitor.newPage();
  await open(page, "/sign-in");
  await page.getByLabel("Correo electrónico").fill(organization.email);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(organization.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/two-factor");

  await page.getByRole("button", { name: "Usar un código de respaldo" }).click();
  await expect(page.getByLabel("Código de respaldo")).toBeFocused();
  await page.keyboard.type(backupCode ?? "");
  await page.getByRole("button", { name: "Verificar y continuar" }).click();
  await page.waitForURL((url) => !/sign-in|two-factor/.test(url.pathname));
  await visitor.close();
});

test("the second step without a pending sign-in sends the person back, invitation kept", async ({
  browser,
}) => {
  const visitor = await browser.newContext();
  const page = await visitor.newPage();
  const invitation = crypto.randomUUID();
  await open(page, `/two-factor?invitation=${invitation}`);
  await page.waitForURL(`**/sign-in?invitation=${invitation}`);
  await visitor.close();
});
