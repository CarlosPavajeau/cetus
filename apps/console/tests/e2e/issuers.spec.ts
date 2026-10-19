import type { TestOrganization } from "../support/organization";
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
