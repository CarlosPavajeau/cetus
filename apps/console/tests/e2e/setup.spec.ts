import type { Page } from "@playwright/test";

import { testCertificate } from "../support/stack";
import { expect, open, test } from "./fixtures";

const softwareId = "381db121-bc49-4286-9067-ef982e3874e4";
const testSetId = "a09e2744-f1d7-4697-bbcf-613bc312450d";

const stepTitle = (page: Page, step: number) => page.getByText(`Paso ${step} de 4`);

async function fillIssuer(page: Page) {
  await page.getByLabel("Nombre o razón social").fill("PAVAJEAU MAX CARLOS ANDRES");
  await page.getByLabel("NIT").fill("1007870923");
  await page.getByLabel("Responsabilidades tributarias").fill("O-47");
  await page.getByLabel("Dirección", { exact: true }).fill("Carrera 11 #13B-62");
  await page.getByLabel("Código postal").fill("200001");
  await page.getByLabel("Departamento").fill("Cesa");
  await page.getByRole("option", { name: "Cesar", exact: true }).click();
  await page.getByLabel("Municipio").fill("Valledu");
  await page.getByRole("option", { name: "Valledupar" }).click();
  await page.getByLabel("Correo electrónico").fill("facturas@pavajeau.test");
  await page.getByLabel("Teléfono").fill("3167040705");
}

async function fillSoftware(page: Page) {
  await page.getByLabel("Software ID").fill(softwareId);
  await page.getByLabel("PIN del software").fill("12345");
  await page.getByLabel("TestSetId / ID del set de pruebas").fill(testSetId);
}

test("signing up takes a new organization to the assistant", async ({ page }) => {
  const id = crypto.randomUUID().slice(0, 8);
  await open(page, "/sign-up");
  await page.getByLabel("Tu nombre").fill("Persona de pruebas");
  await page.getByLabel("Empresa").fill("Registro SAS");
  await page.getByLabel("Correo de trabajo").fill(`e2e-signup-${id}@cetus.test`);
  await page.getByLabel("Contraseña").fill(`clave-${id}-segura`);
  await page.getByRole("button", { name: /crear/i }).click();

  await expect(page).toHaveURL(/\/setup$/);
  await expect(stepTitle(page, 1)).toBeVisible();
  await expect(page.getByText("TEST · Pruebas")).toBeVisible();
});

test("the assistant sets up the issuer and leaves it in habilitación", async ({
  page,
  organization: _,
}) => {
  await open(page, "/overview");
  // With no issuers, the console starts in the assistant.
  await expect(page).toHaveURL(/\/setup$/);

  await fillIssuer(page);
  await expect(page.getByText("Código de municipio: 20001")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(stepTitle(page, 2)).toBeVisible();

  // Every step is saved: a reload resumes where the person left off, with the data in place.
  await open(page, "/setup");
  await expect(stepTitle(page, 2)).toBeVisible();
  // A step ahead is not reachable yet; a saved one links back to its form.
  await expect(page.getByRole("link", { name: /Certificado digital/ })).toHaveCount(0);
  await page.getByRole("link", { name: "1. Datos del emisor · Completado" }).click();
  await expect(page.getByLabel("Nombre o razón social")).toHaveValue("PAVAJEAU MAX CARLOS ANDRES");
  await expect(page.getByLabel("Municipio")).toHaveValue("Valledupar");
  await expect(page.getByLabel("NIT")).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Volver a configuración" }).waitFor();
  await page.getByLabel("Teléfono").fill("3000000000");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(stepTitle(page, 2)).toBeVisible();
  await expect(page.getByText("PAVAJEAU MAX CARLOS ANDRES · NIT 1007870923")).toBeVisible();
  await fillSoftware(page);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(stepTitle(page, 3)).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(testCertificate.path);
  await expect(page.getByText("Archivo seleccionado: test-signer.p12")).toBeVisible();
  await page.getByLabel("Contraseña del certificado").fill(testCertificate.password);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(stepTitle(page, 4)).toBeVisible();
  // The habilitación numbering comes filled in; only the technical key is the person's own.
  await expect(page.getByLabel("Prefijo")).toHaveValue("SETP");
  await expect(page.getByText("SETP 990000000")).toBeVisible();
  await page.getByLabel("Clave técnica").fill("fc8eac422eba16e22ffd8c6f94b3f40a6e38162c");
  await page.getByRole("button", { name: "Guardar y finalizar" }).click();

  // The issuer's page, with the ID to send to the API.
  await expect(page).toHaveURL(/\/issuers\/[0-9a-f-]{36}$/);
  await expect(page.getByText("En habilitación")).toBeVisible();
  await expect(page.getByTestId("issuer-id")).toHaveText(page.url().split("/").at(-1)!);

  // Nothing is left to set up.
  await open(page, "/setup");
  await expect(page).toHaveURL(/\/issuers$/);

  await open(page, "/activity");
  await expect(page.getByText("Emisor actualizado")).toBeVisible();
  await expect(page.getByText("Cambió teléfono")).toBeVisible();
  await expect(page.getByText("Estado del emisor cambiado")).toBeVisible();
});

test("each step says what to fix before saving", async ({ page, organization: _ }) => {
  await open(page, "/setup");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByText("Escribe el nombre o la razón social del RUT.")).toBeVisible();
  await expect(page.getByText("Selecciona el departamento.")).toBeVisible();
  await expect(page.getByText("Escribe un correo válido.")).toBeVisible();
  await expect(stepTitle(page, 1)).toBeVisible();
});

test("a certificate with the wrong password is rejected and can be retried", async ({
  page,
  organization,
}) => {
  // Steps 1 and 2 through the API: this test is about the certificate.
  const created = await organization.api("/console/issuers", {
    method: "POST",
    body: JSON.stringify({
      environment: "TEST",
      nit: "900123456",
      legalName: "Certificados SAS",
      personType: "LEGAL_ENTITY",
      taxLevelCodes: ["O-13"],
      responsibleForIva: true,
      address: {
        municipalityCode: "11001",
        cityName: "Bogotá, D.C.",
        departmentCode: "11",
        departmentName: "Bogotá, D.C.",
        postalCode: "110111",
        line: "Calle 1 # 2-3",
        countryCode: "CO",
        countryName: "Colombia",
      },
      email: "facturas@certificados.test",
    }),
  });
  const { id } = (await created.json()) as { id: string };
  await organization.api(`/console/issuers/${id}/software`, {
    method: "PUT",
    body: JSON.stringify({ softwareId, pin: "12345", testSetId }),
  });

  await open(page, "/setup");
  await expect(stepTitle(page, 3)).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(testCertificate.path);
  await page.getByLabel("Contraseña del certificado").fill("no-es-la-clave");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByText(/No pudimos abrir el certificado/)).toBeVisible();
  await expect(stepTitle(page, 3)).toBeVisible();

  await page.getByLabel("Contraseña del certificado").fill(testCertificate.password);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(stepTitle(page, 4)).toBeVisible();
});

test("the assistant needs a session", async ({ page }) => {
  await open(page, "/setup");

  await expect(page).toHaveURL(/\/sign-in$/);
});
