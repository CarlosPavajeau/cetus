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
  await page.getByLabel("Código de verificación").fill("000000");
  await page.getByRole("button", { name: "Verificar", exact: true }).click();
  await expect(page.getByText("El código no es válido")).toBeVisible();

  await page.getByLabel("Código de verificación").fill(totp(secret));
  await page.getByRole("button", { name: "Verificar", exact: true }).click();
  await page.waitForURL((url) => !/sign-in|two-factor/.test(url.pathname));
});
