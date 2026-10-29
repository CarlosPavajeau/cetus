import { addRange, createIssuer, onboardIssuer } from "../support/issuers";
import { expect, open, pickTaxLevel, test } from "./fixtures";

test("the issuers page shows each issuer's ID for the API", async ({ page, organization }) => {
  const id = await createIssuer(organization, "900123456", "Primero SAS");

  await open(page, "/issuers");
  await expect(
    page.getByLabel("Principal").getByRole("link", { name: "Emisores" }),
  ).toHaveAttribute("data-active");
  const row = page.getByRole("row", { name: /Primero SAS/ });
  await expect(row.getByText(`…${id.slice(-8)}`)).toBeVisible();
  await expect(row.getByRole("link", { name: "Continuar configuración" })).toBeVisible();

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
  await page.getByRole("link", { name: "Nuevo emisor" }).click();
  await expect(page).toHaveURL(/\/setup\?new=true$/);
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByText("Paso 1 de 4")).toBeVisible();
  await expect(page.getByLabel("Razón social")).toHaveValue("");

  await page.getByLabel("Razón social").fill("Segundo SAS");
  await page.getByLabel("NIT").fill("800197268");
  await pickTaxLevel(page, "O-13");
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
  const second = new URL(page.url()).searchParams.get("issuerId") ?? "";
  expect(second).not.toBe(first);
  await expect(page.getByText("Segundo SAS · NIT 800197268")).toBeVisible();

  // Each one resumes on its own.
  await open(page, "/issuers");
  await page
    .getByRole("row", { name: /Segundo SAS/ })
    .getByRole("link", { name: "Continuar configuración" })
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
  const liveId = new URL(page.url()).searchParams.get("issuerId") ?? "";
  expect(liveId).not.toBe(testId);
  await expect(page.getByText("Producción", { exact: true })).toBeVisible();
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
  await page.getByRole("link", { name: "Editar" }).click();
  await expect(page).toHaveURL(new RegExp(`/issuers/${id}/edit$`));
  await expect(page.getByLabel("NIT")).toHaveAttribute("readonly");
  // The person type comes with the NIT: it is fixed once the issuer is set up.
  await expect(page.getByRole("radio", { name: /Persona jurídica/ })).toBeDisabled();

  await page.getByLabel("Razón social").fill("Rut Colombia SAS");
  await pickTaxLevel(page, "R-99-PN");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page).toHaveURL(new RegExp(`/issuers/${id}$`));
  await expect(page.getByRole("heading", { name: "Rut Colombia SAS" })).toBeVisible();
  await expect(page.getByText("R-99-PN")).toBeVisible();
  await expect(page.getByText("En habilitación")).toBeVisible();
});

test("credit and debit note ranges are added from the issuer page", async ({
  page,
  organization,
}) => {
  const id = await onboardIssuer(organization, "900123456", "Notas SAS");

  await open(page, `/issuers/${id}`);
  await expect(page.getByText(/no tiene un rango para notas crédito/)).toBeVisible();

  await page.getByRole("button", { name: "Rango de notas" }).click();
  let dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Prefijo")).toHaveValue("NC");
  await dialog.getByRole("button", { name: "Agregar rango" }).click();
  await expect(page.getByRole("row", { name: /Nota crédito\s*NC/ })).toBeVisible();
  await expect(page.getByText(/no tiene un rango para notas crédito/)).toHaveCount(0);

  await page.getByRole("button", { name: "Rango de notas" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tipo de documento").click();
  await page.getByRole("option", { name: "Nota débito" }).click();
  await expect(dialog.getByLabel("Prefijo")).toHaveValue("ND");
  await dialog.getByLabel("Desde").fill("10");
  await dialog.getByLabel("Hasta").fill("1");
  await dialog.getByRole("button", { name: "Agregar rango" }).click();
  await expect(dialog.getByText(/menor o igual al número final/)).toBeVisible();
  await dialog.getByLabel("Hasta").fill("500");
  await dialog.getByRole("button", { name: "Agregar rango" }).click();
  await expect(page.getByRole("row", { name: /Nota débito\s*ND/ })).toBeVisible();
});
