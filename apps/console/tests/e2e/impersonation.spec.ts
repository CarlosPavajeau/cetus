import { createOrganization } from "../support/organization";
import { createPlatformStaff } from "../support/platform-staff";
import { consoleCookies, consoleUrl } from "../support/stack";
import { expect, open, test } from "./fixtures";

test("an admin sees the console as a person, without touching their credentials, and comes back", async ({
  page,
  context,
}) => {
  const name = `Asistida ${crypto.randomUUID().slice(0, 8)} SAS`;
  const customer = await createOrganization(name);
  const admin = await createPlatformStaff("admin");
  await context.addCookies(consoleCookies(admin.cookies));

  await open(page, `/admin/users?q=${encodeURIComponent(customer.email)}`);
  await page.getByRole("link", { name: /Persona de pruebas/ }).click();
  await page.getByRole("button", { name: "Ver como este usuario" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motivo").fill("Caso 123: no encuentra su llave");
  await dialog.getByRole("button", { name: "Ver la consola" }).click();

  // The console opens as the person, in their organization, with the banner.
  const banner = page.getByRole("complementary", { name: "Sesión de soporte" });
  await expect(banner).toContainText(`Estás viendo la consola como ${customer.email}`);
  await open(page, "/developers/api-keys");
  await expect(banner).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear llave" }).first()).toBeDisabled();

  // Their password stays theirs.
  const changePassword = await page.request.post(`${consoleUrl}/api/auth/change-password`, {
    headers: { Origin: consoleUrl },
    data: { currentPassword: customer.password, newPassword: "otra-clave-larga" },
  });
  expect(changePassword.status()).toBe(403);

  // The visit is in the account's activity, and its filter finds it.
  await open(page, "/activity?action=IMPERSONATION_STARTED");
  await expect(
    page.getByRole("button", { name: /Tipo de acción: Soporte entró como usuario/ }),
  ).toBeVisible();
  const started = page.getByRole("row", { name: /Soporte entró como usuario/ });
  await expect(started).toContainText("Motivo: Caso 123: no encuentra su llave");
  await expect(started).toContainText("Soporte de Cetus");

  // The banner stays in view on a long page.
  await page.mouse.wheel(0, 5000);
  await expect(banner).toBeInViewport();

  await banner.getByRole("button", { name: "Terminar" }).click();
  await page.waitForURL("**/admin/users/**");
  await expect(page.getByRole("heading", { name: "Persona de pruebas" })).toBeVisible();

  await open(page, "/admin/audit-log?action=IMPERSONATION_ENDED");
  await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText(admin.email);
});
