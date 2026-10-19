import { readFile } from "node:fs/promises";

import type { TestOrganization } from "../support/organization";
import { testCertificate } from "../support/stack";
import { expect, open, test } from "./fixtures";

/** Creates an issuer through the API, as step 1 of the assistant would. */
async function createIssuer(organization: TestOrganization, nit: string, legalName: string) {
  const response = await organization.api("/console/issuers", {
    method: "POST",
    body: JSON.stringify({
      environment: "TEST",
      nit,
      legalName,
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
      email: "facturas@emisores.test",
    }),
  });
  return ((await response.json()) as { id: string }).id;
}

/** Sets up a test issuer through the API until it is in habilitación. */
async function onboardIssuer(organization: TestOrganization, nit: string, legalName: string) {
  const id = await createIssuer(organization, nit, legalName);
  await organization.api(`/console/issuers/${id}/software`, {
    method: "PUT",
    body: JSON.stringify({
      softwareId: "381db121-bc49-4286-9067-ef982e3874e4",
      pin: "12345",
      testSetId: "a09e2744-f1d7-4697-bbcf-613bc312450d",
    }),
  });
  await organization.api(`/console/issuers/${id}/certificate`, {
    method: "PUT",
    body: JSON.stringify({
      pkcs12Base64: (await readFile(testCertificate.path)).toString("base64"),
      password: testCertificate.password,
    }),
  });
  await addRange(organization, id, "SETP");
  return id;
}

async function addRange(organization: TestOrganization, id: string, prefix: string) {
  const response = await organization.api(`/console/issuers/${id}/numbering-ranges`, {
    method: "POST",
    body: JSON.stringify({
      documentType: "INVOICE",
      resolutionNumber: "18760000001",
      resolutionDate: "2026-01-01",
      prefix,
      from: 1,
      to: 5000,
      validFrom: "2026-01-01",
      validTo: "2030-12-31",
      technicalKey: "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
    }),
  });
  if (!response.ok) {
    throw new Error(`Adding the range answered ${response.status}`);
  }
}

test("the issuers page shows each issuer's ID for the API", async ({ page, organization }) => {
  const id = await createIssuer(organization, "900123456", "Primero SAS");

  await open(page, "/issuers");
  await expect(
    page.getByLabel("Principal").getByRole("link", { name: "Emisores" }),
  ).toHaveAttribute("data-active");
  const row = page.getByRole("row", { name: /Primero SAS/ });
  await expect(row.getByText(`…${id.slice(-8)}`)).toBeVisible();
  await expect(row.getByRole("button", { name: "Continuar configuración" })).toBeVisible();

  await row.getByRole("link", { name: "Primero SAS" }).click();
  await expect(page).toHaveURL(new RegExp(`/issuers/${id}$`));
  await expect(page.getByTestId("issuer-id")).toHaveText(id);
  await expect(page.getByText(`"issuerId": "${id}"`)).toBeVisible();
  await expect(page.getByText("900123456-8")).toBeVisible();
});

test("a second issuer is set up from the issuers page and resumed by its ID", async ({
  page,
  organization,
}) => {
  const first = await createIssuer(organization, "900123456", "Primero SAS");

  await open(page, "/issuers");
  await page.getByRole("button", { name: "Nuevo emisor" }).click();
  await expect(page).toHaveURL(/\/setup\?new=true$/);
  await expect(page.getByText("Paso 1 de 4")).toBeVisible();
  await expect(page.getByLabel("Nombre o razón social")).toHaveValue("");

  await page.getByLabel("Nombre o razón social").fill("Segundo SAS");
  await page.getByLabel("NIT").fill("800197268");
  await page.getByLabel("Responsabilidades tributarias").fill("O-13");
  await page.getByLabel("Dirección", { exact: true }).fill("Calle 10 # 5-20");
  await page.getByLabel("Código postal").fill("110111");
  await page.getByLabel("Departamento").fill("Bogot");
  await page.getByRole("option", { name: "Bogotá, D.C." }).first().click();
  await page.getByLabel("Municipio").fill("Bogot");
  await page
    .getByRole("option", { name: /Bogotá/ })
    .first()
    .click();
  await page.getByLabel("Correo electrónico").fill("facturas@segundo.test");
  await page.getByRole("button", { name: "Continuar" }).click();

  // The URL names the new issuer, not the first one still being set up.
  await expect(page.getByText("Paso 2 de 4")).toBeVisible();
  await expect(page).toHaveURL(/\/setup\?issuerId=[0-9a-f-]{36}&step=2$/);
  const second = new URL(page.url()).searchParams.get("issuerId")!;
  expect(second).not.toBe(first);
  await expect(page.getByText("Segundo SAS · NIT 800197268")).toBeVisible();

  // Each one resumes on its own.
  await open(page, "/issuers");
  await page
    .getByRole("row", { name: /Segundo SAS/ })
    .getByRole("button", { name: "Continuar configuración" })
    .click();
  await expect(page.getByText("Segundo SAS · NIT 800197268")).toBeVisible();

  await open(page, `/setup?issuerId=${first}`);
  await expect(page.getByText("Primero SAS · NIT 900123456")).toBeVisible();
});

test("an issuer of another organization is not found", async ({ page, organization: _ }) => {
  await open(page, `/issuers/${crypto.randomUUID()}`);

  await expect(page.getByText("Emisor no encontrado")).toBeVisible();
});

test("a test issuer in habilitación is promoted to production", async ({ page, organization }) => {
  const testId = await onboardIssuer(organization, "900123456", "Produccion SAS");

  await open(page, `/issuers/${testId}`);
  await page.getByRole("button", { name: "Pasar a producción" }).click();
  await expect(page.getByText("¿Completaste la habilitación en la DIAN?")).toBeVisible();
  await page.getByRole("button", { name: "Crear emisor de producción" }).click();

  // Software and certificate come along: only the production numbering is left, and nothing is
  // prefilled from habilitación.
  await expect(page).toHaveURL(/\/setup\?issuerId=[0-9a-f-]{36}$/);
  const liveId = new URL(page.url()).searchParams.get("issuerId")!;
  expect(liveId).not.toBe(testId);
  await expect(page.getByText("LIVE · Producción")).toBeVisible();
  await expect(page.getByText("Paso 4 de 4")).toBeVisible();
  await expect(page.getByLabel("Prefijo")).toHaveValue("");

  // Production keeps the software, without a test set.
  await page.getByRole("link", { name: "2. Software DIAN · Completado" }).click();
  await expect(page.getByLabel("Software ID")).toHaveValue("381db121-bc49-4286-9067-ef982e3874e4");
  await expect(page.getByLabel("TestSetId / ID del set de pruebas")).toHaveCount(0);

  await addRange(organization, liveId, "FE");
  await open(page, `/issuers/${liveId}`);
  await expect(page.getByText("Habilitado", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "ver emisor de pruebas" }).click();
  await expect(page).toHaveURL(new RegExp(`/issuers/${testId}$`));
  // Promoted once: the test issuer links to its production issuer instead.
  await expect(page.getByRole("button", { name: "Pasar a producción" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "ver emisor de producción" })).toBeVisible();
});

test("an issuer in habilitación keeps its tax data in line with its RUT", async ({
  page,
  organization,
}) => {
  const id = await onboardIssuer(organization, "900123456", "Rut SAS");

  await open(page, `/issuers/${id}`);
  await page.getByRole("button", { name: "Editar" }).click();
  await expect(page).toHaveURL(new RegExp(`/issuers/${id}/edit$`));
  await expect(page.getByLabel("NIT")).toHaveAttribute("readonly");
  // The person type comes with the NIT: it is fixed once the issuer is set up.
  await expect(page.getByLabel("Tipo de persona")).toBeDisabled();

  await page.getByLabel("Nombre o razón social").fill("Rut Colombia SAS");
  await page.getByLabel("Responsabilidades tributarias").fill("R-99-PN");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page).toHaveURL(new RegExp(`/issuers/${id}$`));
  await expect(page.getByRole("heading", { name: "Rut Colombia SAS" })).toBeVisible();
  await expect(page.getByText("R-99-PN")).toBeVisible();
  await expect(page.getByText("En habilitación")).toBeVisible();
});
