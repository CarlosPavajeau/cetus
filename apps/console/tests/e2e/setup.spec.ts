import type { Page } from "@playwright/test";
import { type } from "arktype";

import { createIssuer, testSoftware, uniqueNit } from "../support/issuers";
import { testCertificate } from "../support/stack";
import { expect, fillIssuer, open, test } from "./fixtures";

const { softwareId, testSetId } = testSoftware;

const stepTitle = (page: Page, step: number) => page.getByText(`Paso ${step} de 4`);

async function fillSoftware(page: Page, { testSet = true }: { testSet?: boolean } = {}) {
  await page.getByLabel("Software ID").fill(softwareId);
  await page.getByLabel("PIN del software").fill("12345");
  if (testSet) {
    await page.getByLabel("TestSetId / ID del set de pruebas").fill(testSetId);
  }
}

test("signing up opens the console in the sandbox, with the assistant one click away", async ({
  page,
}) => {
  const id = crypto.randomUUID().slice(0, 8);
  await open(page, "/sign-up");
  await page.getByLabel("Nombre completo").fill("Persona de pruebas");
  await page.getByLabel("Correo electrónico").fill(`e2e-signup-${id}@cetus.test`);
  // Exact: "Confirmar contraseña" and the "Mostrar contraseña" buttons match too.
  await page.getByLabel("Contraseña", { exact: true }).fill(`clave-${id}-segura`);
  await page.getByLabel("Confirmar contraseña").fill(`clave-${id}-segura`);
  await page.getByRole("checkbox", { name: /Acepto los términos/ }).check();
  await page.getByRole("button", { name: /crear/i }).click();

  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole("complementary", { name: "Modo simulación" })).toBeVisible();
  await page.getByRole("link", { name: "Configurar emisor" }).click();
  await expect(page).toHaveURL(/\/setup$/);
  // What to have at hand comes first; the form starts once the person is ready.
  await expect(page.getByRole("heading", { name: "Antes de empezar" })).toBeVisible();
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(stepTitle(page, 1)).toBeVisible();
});

test("the assistant sets up the issuer and leaves it in habilitación", async ({
  page,
  organization: _,
}) => {
  await open(page, "/setup");
  await page.getByRole("button", { name: "Empezar" }).click();

  const issuer = await fillIssuer(page);
  await expect(page.getByText("Código DANE: 20001")).toBeVisible();
  const checkDigitWrong = String((Number(issuer.checkDigit) + 1) % 10);
  await page.getByLabel("NIT").fill(`${issuer.nit}-${checkDigitWrong}`);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByText(`El dígito de verificación de ese NIT es ${issuer.checkDigit}.`),
  ).toBeVisible();
  await page.getByLabel("NIT").fill(`${issuer.nit}-${issuer.checkDigit}`);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(stepTitle(page, 2)).toBeVisible();

  // Every step is saved: a reload resumes where the person left off, with the data in place.
  await open(page, "/setup");
  await expect(stepTitle(page, 2)).toBeVisible();
  // A step ahead is not reachable yet; a saved one links back to its form.
  await expect(page.getByRole("link", { name: /Certificado digital/ })).toHaveCount(0);
  await page.getByRole("link", { name: "1. Datos del emisor · Completado" }).click();
  await expect(page.getByLabel("Nombre completo")).toHaveValue(issuer.legalName);
  await expect(page.getByLabel("Municipio")).toHaveValue("Valledupar");
  await expect(page.getByLabel("NIT")).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Salir" }).waitFor();
  await page.getByLabel("Teléfono").fill("3000000000");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(stepTitle(page, 2)).toBeVisible();
  await expect(page.getByText(`${issuer.legalName} · NIT ${issuer.nit}`)).toBeVisible();
  await fillSoftware(page);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(stepTitle(page, 3)).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(testCertificate.path);
  await expect(page.getByText("Archivo seleccionado: test-signer.p12")).toBeVisible();
  await page.getByLabel("Contraseña del certificado").fill(testCertificate.password);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(stepTitle(page, 4)).toBeVisible();
  // The habilitación numbering comes filled in; only the technical key is the person's own.
  await expect(page.getByLabel("Prefijo")).toHaveCount(0);
  await expect(page.getByText("990000000 a 995000000")).toBeVisible();
  await page.getByRole("button", { name: "Editar rango" }).click();
  await expect(page.getByLabel("Prefijo")).toHaveValue("SETP");
  await page.getByLabel("Clave técnica").fill("fc8eac422eba16e22ffd8c6f94b3f40a6e38162c");
  await page.getByRole("button", { name: "Finalizar configuración" }).click();

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

test("a test issuer that finished its test set leaves the TestSetId empty", async ({
  page,
  organization,
}) => {
  const id = await createIssuer(organization, uniqueNit(), "Set Terminado SAS");

  await open(page, `/setup?issuerId=${id}`);
  await expect(stepTitle(page, 2)).toBeVisible();
  await fillSoftware(page, { testSet: false });
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(stepTitle(page, 3)).toBeVisible();
  const detail = await organization.api(`/console/issuers/${id}`);
  const { software } = type({ software: { testSetId: "string | null" } }).assert(
    await detail.json(),
  );
  expect(software.testSetId).toBeNull();
});

test("each step says what to fix before saving", async ({ page, organization: _ }) => {
  await open(page, "/setup");
  await page.getByRole("button", { name: "Empezar" }).click();
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
  const { id } = type({ id: "string" }).assert(await created.json());
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
