import { latestEmailTo, linkTo } from "../support/outbox";
import { expect, open, test } from "./fixtures";

test("signing up asks to confirm the address until its link is opened", async ({ page }) => {
  const id = crypto.randomUUID().slice(0, 8);
  const email = `e2e-registro-${id}@cetus.test`;
  const password = `clave-${id}-segura`;
  await open(page, "/sign-up");
  await page.getByLabel("Nombre completo").fill("Persona de pruebas");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByLabel("Confirmar contraseña").fill(password);
  await page.getByRole("checkbox", { name: /Acepto los términos/ }).check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL("**/overview", { waitUntil: "networkidle" });

  const banner = page.getByRole("complementary", { name: "Correo sin confirmar" });
  await expect(banner).toContainText(email);
  const confirmation = await latestEmailTo(email);
  expect(confirmation.subject).toBe("Confirma tu correo en Cetus");

  await banner.getByRole("button", { name: "Reenviar" }).click();
  await expect(banner).toContainText(`Te enviamos el enlace a ${email}`);
  await expect(banner.getByRole("button", { name: "Reenviar" })).toBeDisabled();

  await open(page, linkTo(await latestEmailTo(email), "/api/auth/verify-email"));
  await expect(page).toHaveURL(/\/overview$/);
  await expect(banner).toBeHidden();
});
