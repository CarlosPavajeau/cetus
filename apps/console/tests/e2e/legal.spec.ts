import { legalDocuments } from "~/features/legal/documents";

import { consentsOf, forgetConsents } from "../support/consents";
import { consoleUrl } from "../support/stack";
import { expect, open, test } from "./fixtures";

const currentConsents = [
  { document: "privacy", version: legalDocuments.privacy.version },
  { document: "terms", version: legalDocuments.terms.version },
];

for (const [path, title] of [
  ["/legal/terminos", "Términos de servicio"],
  ["/legal/privacidad", "Política de tratamiento de datos personales"],
  ["/legal/encargo", "Acuerdo de encargo de datos personales"],
] as const) {
  test(`${path} opens without a session`, async ({ page }) => {
    await open(page, path);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  });
}

test("signing up takes accepting the terms, and records the versions accepted", async ({
  page,
}) => {
  const id = crypto.randomUUID().slice(0, 8);
  const email = `e2e-legal-${id}@cetus.test`;
  await open(page, "/sign-up");
  await page.getByLabel("Nombre completo").fill("Persona de pruebas");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(`clave-${id}-segura`);
  await page.getByLabel("Confirmar contraseña").fill(`clave-${id}-segura`);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(
    page.getByText("Acepta los términos y la política de datos para continuar."),
  ).toBeVisible();
  expect(await consentsOf(email)).toEqual([]);

  await page.getByRole("checkbox", { name: /Acepto los términos/ }).check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL("**/overview", { waitUntil: "networkidle" });
  expect(await consentsOf(email)).toEqual(currentConsents);
});

test("Better Auth refuses a sign-up that does not name the current documents", async () => {
  const id = crypto.randomUUID().slice(0, 8);
  const response = await fetch(`${consoleUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: consoleUrl },
    body: JSON.stringify({
      name: "Persona de pruebas",
      email: `e2e-legal-api-${id}@cetus.test`,
      password: `clave-${id}-segura`,
    }),
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "LEGAL_ACCEPTANCE_REQUIRED" });
});

test("a new version asks to accept it before going on to the page", async ({
  page,
  organization,
}) => {
  await forgetConsents(organization.email);
  await open(page, "/documents");
  await expect(page).toHaveURL(/\/legal\/accept\?/);
  await expect(
    page.getByRole("heading", { name: "Actualizamos nuestros documentos" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Aceptar y continuar" }).click();
  await expect(
    page.getByText("Acepta los términos y la política de datos para continuar."),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: /Leí y acepto/ }).check();
  await page.getByRole("button", { name: "Aceptar y continuar" }).click();
  await expect(page).toHaveURL(/\/documents$/);
  expect(await consentsOf(organization.email)).toEqual(currentConsents);
});
