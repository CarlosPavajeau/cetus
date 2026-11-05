import type { Locator, Page } from "@playwright/test";
import { type } from "arktype";

import { nitCheckDigit } from "~/features/issuance/nitCheckDigit";

import { expect, open as openPage, pickTaxLevel, test } from "../e2e/fixtures";
import { grantPackage } from "../support/credits";
import { markEmailVerified } from "../support/invitations";
import {
  createTestApiKey,
  issueInvoice,
  onboardIssuer,
  testSoftware,
  uniqueNit,
  waitForStatus,
} from "../support/issuers";
import type { TestOrganization } from "../support/organization";
import { consoleCookies, testCertificate } from "../support/stack";

const directory = new URL("../../../docs/public/images/consola/", import.meta.url).pathname;

async function open(page: Page, path: string) {
  await openPage(page, path);
  await page.addStyleTag({ content: ".tsqd-parent-container { display: none !important; }" });
}

async function capture(
  page: Page,
  name: string,
  { mask = [], height }: { mask?: Locator[]; height?: number } = {},
) {
  await page.screenshot({
    path: `${directory}${name}.png`,
    clip: height === undefined ? undefined : { x: 0, y: 0, width: 1280, height },
    mask,
    maskColor: "#e4e4e7",
    animations: "disabled",
  });
}

function checkedNit() {
  const nit = uniqueNit();
  const checkDigit = nitCheckDigit(nit);
  if (checkDigit === null) {
    throw new Error(`${nit} is not a NIT`);
  }
  return `${nit}-${checkDigit}`;
}

async function acceptedInTestSet(organization: TestOrganization, issuerId: string) {
  const response = await organization.api(`/console/issuers/${issuerId}`);
  const { testSet } = type({
    testSet: type({ documents: type({ documentType: "string", accepted: "number" }).array() }).or(
      "null",
    ),
  }).assert(await response.json());
  return testSet?.documents.find((row) => row.documentType === "INVOICE")?.accepted ?? 0;
}

test.beforeEach(async ({ organization }) => {
  await markEmailVerified(organization.email);
});

test("the habilitación path, from the RUT to production", async ({ page, organization }) => {
  await open(page, "/setup");
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("radio", { name: /Persona jurídica/ }).click();
  await page.getByLabel("Razón social").fill("Tu Empresa SAS");
  await page.getByLabel("NIT").pressSequentially(checkedNit());
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
  await page.getByLabel("Correo electrónico").fill("facturas@tuempresa.test");
  await page.getByLabel("Teléfono").fill("6011234567");
  await page.getByRole("radio", { name: /Sí, soy responsable de IVA/ }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture(page, "habilitacion-rut");

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Paso 2 de 4")).toBeVisible();
  await page.getByLabel("Software ID").fill(testSoftware.softwareId);
  await page.getByLabel("PIN del software").fill(testSoftware.pin);
  await page.getByLabel("TestSetId / ID del set de pruebas").fill(testSoftware.testSetId);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByText("Paso 3 de 4")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(testCertificate.path);
  await page.getByLabel("Contraseña del certificado").fill(testCertificate.password);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByText("Paso 4 de 4")).toBeVisible();
  await page.getByRole("button", { name: "Editar rango" }).click();
  await page.getByLabel("Clave técnica").fill("fc8eac422eba16e22ffd8c6f94b3f40a6e38162c");
  await capture(page, "habilitacion-numeracion");
  await page.getByRole("button", { name: "Finalizar configuración" }).click();
  await expect(page).toHaveURL(/\/issuers\/[0-9a-f-]{36}$/);
  const issuerId = new URL(page.url()).pathname.split("/").at(-1) ?? "";

  const apiKey = await createTestApiKey(organization);
  await Promise.all(
    ["Cliente de prueba 1", "Cliente de prueba 2", "Cliente de prueba 3"].map(async (customer) => {
      const invoice = await issueInvoice(apiKey, issuerId, customer);
      await waitForStatus(organization, invoice.id);
    }),
  );
  await expect
    .poll(async () => acceptedInTestSet(organization, issuerId), { timeout: 60_000 })
    .toBe(3);
  await grantPackage(organization);
  await page.context().addCookies(consoleCookies([{ name: "cetus-environment", value: "TEST" }]));
  await open(page, `/issuers/${issuerId}`);
  await page.getByTestId("test-set-progress").scrollIntoViewIfNeeded();
  await capture(page, "habilitacion-set-de-pruebas");

  await page.getByRole("button", { name: "Pasar a producción" }).click();
  await expect(page.getByText("¿Completaste la habilitación en la DIAN?")).toBeVisible();
  await capture(page, "habilitacion-produccion");
});

// Three clients in production, as many as the plans for accountants include, and a fourth in habilitación.
test("an accountant's issuers, one per client", async ({ page, organization }) => {
  await grantPackage(organization);
  await Promise.all([
    ...["Panadería Santa Clara SAS", "Transportes del Llano SAS", "Consultores Andinos SAS"].map(
      (client) =>
        onboardIssuer(organization, uniqueNit(), client, { testSet: false, environment: "LIVE" }),
    ),
    onboardIssuer(organization, uniqueNit(), "Ferretería El Roble SAS", { testSet: false }),
  ]);

  await open(page, "/issuers");
  await expect(page.getByRole("row", { name: /Ferretería El Roble SAS/ })).toBeVisible();
  await capture(page, "emisores-varios", { height: 640 });
});
