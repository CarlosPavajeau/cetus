import { devices } from "@playwright/test";
import { type } from "arktype";
import { config } from "dotenv";
import { Pool } from "pg";

import { latestEmailTo } from "../support/outbox";
import { createPlatformStaff, totp } from "../support/platform-staff";
import { consoleCookies } from "../support/stack";
import { expect, open, test } from "./fixtures";

config({ quiet: true });

/** What the security page left in the database for this person: the 2FA secret and a pending replacement. */
async function storedTwoFactor(email: string) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query(
      `SELECT (SELECT count(*) FROM auth.two_factor t WHERE t.user_id = u.id) AS secrets,
              (SELECT count(*) FROM auth.verification v WHERE v.identifier = 'replace-totp-' || u.id)
                AS replacements
         FROM auth."user" u WHERE u.email = $1`,
      [email],
    );
    return type({ secrets: "string.integer.parse", replacements: "string.integer.parse" }).assert(
      rows[0],
    );
  } finally {
    await pool.end();
  }
}

test("2FA is enabled from the security page and then asked at sign-in", async ({
  page,
  organization,
}) => {
  await open(page, "/settings/security");
  await page.getByRole("textbox", { name: "Contraseña" }).fill(organization.password);
  await page.getByRole("button", { name: "Activar verificación en dos pasos" }).click();

  await expect(page.getByRole("img", { name: "Código QR de la verificación" })).toBeVisible();
  await expect(page.getByLabel("Código de verificación")).toBeFocused();
  const secret = ((await page.locator("code").first().textContent()) ?? "").replace(/\s/g, "");
  await page.getByLabel("Código de verificación").fill(totp(secret));

  await expect(
    page.getByRole("heading", { name: "Verificación en dos pasos activada" }),
  ).toBeFocused();
  await expect(page.getByText("Verificación activa")).toBeVisible();
  await page.getByRole("button", { name: "Ya guardé mis códigos" }).click();
  await expect(
    page.getByRole("heading", { name: "Códigos de respaldo", exact: true }),
  ).toBeFocused();

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

test.describe("on a touch screen", () => {
  const { defaultBrowserType: _, ...pixel } = devices["Pixel 7"];
  test.use(pixel);

  test("2FA setup opens the authenticator first and shows the QR only on request", async ({
    page,
    organization,
  }) => {
    await open(page, "/settings/security");
    await page.getByRole("textbox", { name: "Contraseña" }).fill(organization.password);
    await page.getByRole("button", { name: "Activar verificación en dos pasos" }).click();

    await expect(
      page.getByRole("link", { name: "Abrir en la aplicación de autenticación" }),
    ).toHaveAttribute("href", /^otpauth:\/\//);
    await expect(page.getByRole("img", { name: "Código QR de la verificación" })).toHaveCount(0);
    const showQr = page.getByRole("button", { name: "Escanear desde otro dispositivo" });
    await expect(showQr).toHaveAttribute("aria-expanded", "false");
    await showQr.click();
    await expect(page.getByRole("img", { name: "Código QR de la verificación" })).toBeVisible();
    await page.getByRole("button", { name: "Ocultar el código QR" }).click();
    await expect(page.getByRole("img", { name: "Código QR de la verificación" })).toHaveCount(0);

    const secret = ((await page.locator("code").first().textContent()) ?? "").replace(/\s/g, "");
    await page.getByLabel("Código de verificación").fill(totp(secret));
    await expect(
      page.getByRole("heading", { name: "Verificación en dos pasos activada" }),
    ).toBeFocused();
  });
});

test("with 2FA on, backup codes are replaced and 2FA is turned off, each behind the password", async ({
  page,
  organization,
}) => {
  await open(page, "/settings/security");
  await page.getByRole("textbox", { name: "Contraseña" }).fill(organization.password);
  await page.getByRole("button", { name: "Activar verificación en dos pasos" }).click();
  await expect(page.getByLabel("Código de verificación")).toBeVisible();
  expect(await storedTwoFactor(organization.email)).toEqual({ secrets: 1, replacements: 0 });
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("heading", { name: "Verificación en dos pasos" })).toBeFocused();
  expect(await storedTwoFactor(organization.email)).toEqual({ secrets: 0, replacements: 0 });
  await page.getByRole("textbox", { name: "Contraseña" }).fill(organization.password);
  await page.getByRole("button", { name: "Activar verificación en dos pasos" }).click();
  const secret = ((await page.locator("code").first().textContent()) ?? "").replace(/\s/g, "");
  await page.getByLabel("Código de verificación").fill(totp(secret));
  const backupCodes = page.getByRole("list", { name: "Códigos de respaldo" }).getByRole("listitem");
  await expect(backupCodes).not.toHaveCount(0);
  const enrolled = await backupCodes.allTextContents();
  await page.getByRole("button", { name: "Ya guardé mis códigos" }).click();
  await expect(
    page.getByText(`Te quedan ${enrolled.length} de ${enrolled.length} códigos`),
  ).toBeVisible();

  await page.getByRole("button", { name: "Generar nuevos códigos de respaldo" }).click();
  await expect(page.getByRole("textbox", { name: "Contraseña" })).toBeFocused();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(
    page.getByRole("button", { name: "Generar nuevos códigos de respaldo" }),
  ).toBeFocused();

  await page.getByRole("button", { name: "Generar nuevos códigos de respaldo" }).click();
  await page.getByRole("button", { name: "Desactivar verificación" }).click();
  await expect(page.getByRole("textbox", { name: "Contraseña" })).toHaveCount(1);
  await page.getByRole("button", { name: "Generar nuevos códigos de respaldo" }).click();
  await page.getByRole("textbox", { name: "Contraseña" }).fill(organization.password);
  await page.getByRole("button", { name: "Generar códigos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nuevos códigos de respaldo" })).toBeFocused();
  const regenerated = await backupCodes.allTextContents();
  expect(regenerated).toHaveLength(enrolled.length);
  expect(regenerated).not.toContain(enrolled[0]);
  await page.getByRole("button", { name: "Ya guardé mis códigos" }).click();

  await page.getByRole("button", { name: "Desactivar verificación" }).click();
  await page.getByRole("textbox", { name: "Contraseña" }).fill(`${organization.password}x`);
  await page.getByRole("button", { name: "Desactivar verificación" }).click();
  await expect(page.getByText("La contraseña no coincide.")).toBeVisible();
  await page.getByRole("textbox", { name: "Contraseña" }).fill(organization.password);
  await page.getByRole("button", { name: "Desactivar verificación" }).click();
  await expect(page.getByText("Verificación en dos pasos desactivada")).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Activar verificación en dos pasos" }),
  ).toBeVisible();
});

test("leaving with the backup codes on screen asks first, and staff go back to the page they asked for", async ({
  page,
  context,
}) => {
  const staff = await createPlatformStaff("admin", { twoFactor: false });
  await context.clearCookies();
  await context.addCookies(consoleCookies(staff.cookies));
  await open(page, "/admin/audit-log");
  await expect(page).toHaveURL(/\/settings\/security\?required=true/);

  await page.getByRole("textbox", { name: "Contraseña" }).fill(staff.password);
  await page.getByRole("button", { name: "Activar verificación en dos pasos" }).click();
  const secret = ((await page.locator("code").first().textContent()) ?? "").replace(/\s/g, "");
  await page.getByLabel("Código de verificación").fill(totp(secret));
  await expect(
    page.getByRole("heading", { name: "Verificación en dos pasos activada" }),
  ).toBeFocused();

  await page.getByRole("link", { name: "Resumen" }).click();
  const warning = page.getByRole("alertdialog", {
    name: "¿Salir sin guardar tus códigos de respaldo?",
  });
  await expect(warning).toBeVisible();
  await warning.getByRole("button", { name: "Volver a los códigos" }).click();
  await expect(page.getByRole("list", { name: "Códigos de respaldo" })).toBeVisible();

  await page.getByRole("button", { name: "Ya los guardé, ir a la administración" }).click();
  await page.waitForURL("**/admin/audit-log");
});

test("a new authenticator app replaces the old one only once its code is right, backup codes kept", async ({
  page,
  browser,
  organization,
}) => {
  await open(page, "/settings/security");
  await page.getByRole("textbox", { name: "Contraseña" }).fill(organization.password);
  await page.getByRole("button", { name: "Activar verificación en dos pasos" }).click();
  const secretOld = ((await page.locator("code").first().textContent()) ?? "").replace(/\s/g, "");
  await page.getByLabel("Código de verificación").fill(totp(secretOld));
  const backupCodeItems = page
    .getByRole("list", { name: "Códigos de respaldo" })
    .getByRole("listitem");
  await expect(backupCodeItems).not.toHaveCount(0);
  const [backupCode = ""] = await backupCodeItems.allTextContents();
  await page.getByRole("button", { name: "Ya guardé mis códigos" }).click();
  await page.getByRole("button", { name: "Cambiar de aplicación" }).click();
  await expect(page.getByRole("textbox", { name: "Contraseña" })).toBeFocused();
  await page.getByRole("textbox", { name: "Contraseña" }).fill(organization.password);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Conecta tu nueva aplicación" })).toBeVisible();

  await page.getByRole("link", { name: "Resumen" }).click();
  const warning = page.getByRole("alertdialog", {
    name: "¿Salir sin terminar el cambio de aplicación?",
  });
  await expect(warning).toBeVisible();
  await warning.getByRole("button", { name: "Seguir con el cambio" }).click();

  const secretNew = ((await page.locator("code").first().textContent()) ?? "").replace(/\s/g, "");
  expect(secretNew).not.toBe(secretOld);
  await page.getByLabel("Código de verificación").fill(totp(secretOld));
  await expect(page.getByText("El código no es válido")).toBeVisible();
  await page.getByLabel("Código de verificación").fill(totp(secretNew));
  await expect(page.getByText("Cambiaste tu aplicación de autenticación")).toBeFocused();
  await expect(page.getByText("Verificación activa")).toBeVisible();

  const notice = await latestEmailTo(organization.email);
  expect(notice.subject).toBe("Cambiaste la aplicación de autenticación de Cetus");
  expect(notice.text).toContain("tus códigos de respaldo siguen funcionando");

  async function signIn() {
    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();
    await open(visitorPage, "/sign-in");
    await visitorPage.getByLabel("Correo electrónico").fill(organization.email);
    await visitorPage.getByRole("textbox", { name: "Contraseña" }).fill(organization.password);
    await visitorPage.getByRole("button", { name: "Iniciar sesión" }).click();
    await visitorPage.waitForURL("**/two-factor");
    return { visitor, visitorPage };
  }

  const withApp = await signIn();
  await withApp.visitorPage.getByLabel("Código de verificación").fill(totp(secretOld));
  await expect(withApp.visitorPage.getByText("El código no es válido")).toBeVisible();
  await withApp.visitorPage.getByLabel("Código de verificación").fill(totp(secretNew));
  await withApp.visitorPage.waitForURL((url) => !/sign-in|two-factor/.test(url.pathname));
  await withApp.visitor.close();

  const withBackupCode = await signIn();
  await withBackupCode.visitorPage
    .getByRole("button", { name: "Usar un código de respaldo" })
    .click();
  await expect(withBackupCode.visitorPage.getByLabel("Código de respaldo")).toBeFocused();
  await withBackupCode.visitorPage.keyboard.type(backupCode);
  await withBackupCode.visitorPage.getByRole("button", { name: "Verificar y continuar" }).click();
  await withBackupCode.visitorPage.waitForURL((url) => !/sign-in|two-factor/.test(url.pathname));
  await withBackupCode.visitor.close();

  await page.reload();
  await expect(page.getByText("Te quedan 9 de 10 códigos")).toBeVisible();
});

test("canceling a new authenticator app drops it and keeps the active one", async ({
  page,
  organization,
}) => {
  await open(page, "/settings/security");
  await page.getByRole("textbox", { name: "Contraseña" }).fill(organization.password);
  await page.getByRole("button", { name: "Activar verificación en dos pasos" }).click();
  const secret = ((await page.locator("code").first().textContent()) ?? "").replace(/\s/g, "");
  await page.getByLabel("Código de verificación").fill(totp(secret));
  await page.getByRole("button", { name: "Ya guardé mis códigos" }).click();
  await page.getByRole("button", { name: "Cambiar de aplicación" }).click();
  await page.getByRole("textbox", { name: "Contraseña" }).fill(organization.password);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByText(/Tienes hasta las \d{2}:\d{2} para terminar el cambio/),
  ).toBeVisible();
  expect(await storedTwoFactor(organization.email)).toEqual({ secrets: 1, replacements: 1 });

  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("heading", { name: "Aplicación de autenticación" })).toBeFocused();
  expect(await storedTwoFactor(organization.email)).toEqual({ secrets: 1, replacements: 0 });
  await expect(page.getByText("Verificación activa")).toBeVisible();
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
  await page.waitForURL(`**/sign-in?invitation=${invitation}&expired=true`);
  await expect(page.getByText("La verificación venció")).toBeVisible();
  await visitor.close();
});
