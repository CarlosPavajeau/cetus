import {
  createTestApiKey,
  issueInvoice,
  onboardIssuer,
  uniqueNit,
  waitForStatus,
} from "../support/issuers";
import type { TestOrganization } from "../support/organization";
import { expect, open, test } from "./fixtures";

/** The sample issuer every new organization starts with. */
async function sandboxIssuer(organization: TestOrganization) {
  const response = await organization.api("/console/issuers");
  const issuers = (await response.json()) as { id: string; environment: string }[];
  const sample = issuers.find((issuer) => issuer.environment === "SANDBOX");
  if (!sample) {
    throw new Error("The organization has no sandbox issuer");
  }
  return sample.id;
}

test("a new organization issues a simulated invoice without any setup", async ({
  page,
  organization,
}) => {
  const issuerId = await sandboxIssuer(organization);

  // A new key is a sandbox key unless another environment is chosen.
  await open(page, "/developers/api-keys");
  await page.getByRole("button", { name: "Crear llave" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre").fill("Integración de prueba");
  await dialog.getByRole("button", { name: "Crear llave" }).click();
  const field = dialog.getByLabel("Llave de API");
  await expect(field).toHaveValue(/^cetus_sandbox_[A-Za-z0-9]{40}$/);
  const secret = await field.inputValue();

  const invoice = await issueInvoice(secret, issuerId, "Cliente Simulado");
  expect(invoice.number).toMatch(/^SIM\d+$/);
  expect(await waitForStatus(organization, invoice.id)).toBe("ACCEPTED");

  await open(page, "/documents");
  await expect(page.getByRole("link", { name: invoice.number })).toBeVisible();
  await expect(page.getByText("Simulación").first()).toBeVisible();
});

test("the sample issuer needs no setup", async ({ page, organization }) => {
  const issuerId = await sandboxIssuer(organization);

  await open(page, `/issuers/${issuerId}`);

  await expect(page.getByRole("heading", { name: "Numeración simulada" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continuar configuración" })).toHaveCount(0);
  await expect(page.getByText("Software ID")).toHaveCount(0);
});

test("a real document never shows under the simulation warning", async ({ page, organization }) => {
  const issuerId = await onboardIssuer(organization, uniqueNit(), "Real SAS", { testSet: false });
  const invoice = await issueInvoice(
    await createTestApiKey(organization),
    issuerId,
    "Cliente Real",
  );

  await open(page, `/documents/${invoice.id}`);
  await page.getByRole("combobox", { name: "Ambiente" }).click();
  await page.getByRole("option", { name: "Simulación" }).click();

  // Leaving the document's environment goes back to the list, now under the warning.
  await expect(page).toHaveURL(/\/documents$/);
  await expect(page.getByRole("complementary", { name: "Modo simulación" })).toBeVisible();

  // Opened directly, the document follows its own environment, not the selector.
  await open(page, `/documents/${invoice.id}`);
  await expect(page.getByRole("heading", { name: `Factura ${invoice.number}` })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Modo simulación" })).toHaveCount(0);
});
