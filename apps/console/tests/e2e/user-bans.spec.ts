import { createOrganization } from "../support/organization";
import { createPlatformStaff } from "../support/platform-staff";
import { consoleUrl } from "../support/stack";
import { expect, open, test } from "./fixtures";

test("an admin bans a person: they lose their session at once and cannot sign in until unbanned", async ({
  page,
  context,
  browser,
}) => {
  const customer = await createOrganization("Bloqueada SAS");
  const admin = await createPlatformStaff("admin");
  await context.addCookies(admin.cookies.map((cookie) => ({ ...cookie, url: consoleUrl })));

  // The customer is signed in, in their own browser.
  const customerContext = await browser.newContext();
  await customerContext.addCookies(
    customer.cookies.map((cookie) => ({ ...cookie, url: consoleUrl })),
  );
  const customerPage = await customerContext.newPage();
  await open(customerPage, "/activity");
  await expect(customerPage.getByRole("heading", { name: "Registro de actividad" })).toBeVisible();

  await open(page, `/admin/users?q=${encodeURIComponent(customer.email)}`);
  await page.getByRole("link", { name: /Persona de pruebas/ }).click();
  await page.getByRole("button", { name: "Bloquear usuario" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "Hasta que se desbloquee" }).click();
  await dialog.getByLabel("Motivo").fill("Uso fraudulento de la cuenta");
  await dialog.getByRole("button", { name: "Bloquear" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Bloqueado hasta que se desbloquee")).toBeVisible();

  // Their next request has no session.
  await customerPage.reload();
  await customerPage.waitForURL("**/sign-in");
  await customerPage.waitForLoadState("networkidle");
  await customerPage.getByLabel("Correo electrónico").fill(customer.email);
  await customerPage.getByRole("textbox", { name: "Contraseña" }).fill(customer.password);
  await customerPage.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(customerPage.getByText("Tu acceso a Cetus está bloqueado")).toBeVisible();

  await open(page, "/admin/audit-log?action=USER_BANNED");
  await expect(
    page.getByRole("row", { name: new RegExp(customer.email.replaceAll(".", "\\.")) }),
  ).toContainText("Motivo: Uso fraudulento de la cuenta");

  await open(page, `/admin/users?q=${encodeURIComponent(customer.email)}`);
  await page.getByRole("link", { name: /Persona de pruebas/ }).click();
  await page.getByRole("button", { name: "Desbloquear usuario" }).click();
  await page.getByRole("dialog").getByLabel("Motivo").fill("Verificado con el cliente");
  await page.getByRole("dialog").getByRole("button", { name: "Desbloquear" }).click();
  await expect(page.getByRole("button", { name: "Bloquear usuario" })).toBeVisible();

  await customerPage.getByRole("button", { name: "Iniciar sesión" }).click();
  await customerPage.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
  await customerContext.close();
});

test("the Cetus team cannot be banned, and support cannot ban anyone", async ({
  page,
  context,
}) => {
  const support = await createPlatformStaff("support");
  const customer = await createOrganization();
  await context.addCookies(support.cookies.map((cookie) => ({ ...cookie, url: consoleUrl })));

  await open(page, `/admin/users?q=${encodeURIComponent(customer.email)}`);
  await page.getByRole("link", { name: /Persona de pruebas/ }).click();
  await expect(page.getByRole("heading", { name: "Persona de pruebas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bloquear usuario" })).toHaveCount(0);

  const admin = await createPlatformStaff("admin");
  await context.clearCookies();
  await context.addCookies(admin.cookies.map((cookie) => ({ ...cookie, url: consoleUrl })));
  await open(page, `/admin/users?q=${encodeURIComponent(support.email)}`);
  await page.getByRole("link", { name: /Persona de pruebas/ }).click();
  await expect(page.getByText("Soporte Cetus")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bloquear usuario" })).toHaveCount(0);
});
