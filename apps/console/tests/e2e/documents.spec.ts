import { createTestApiKey, issueInvoice, onboardIssuer } from "../support/issuers";
import { expect, open, test } from "./fixtures";

test("the documents page lists the invoices and opens their detail", async ({
  page,
  organization,
}) => {
  const issuerId = await onboardIssuer(organization, "900123456", "Documentos SAS");
  const apiKey = await createTestApiKey(organization);
  const first = await issueInvoice(apiKey, issuerId, "Cliente Uno");
  const second = await issueInvoice(apiKey, issuerId, "Cliente Dos");

  await open(page, "/documents");
  await expect(
    page.getByLabel("Principal").getByRole("link", { name: "Documentos" }),
  ).toHaveAttribute("data-active");
  await expect(page.getByRole("link", { name: first.number })).toBeVisible();
  await expect(page.getByRole("link", { name: second.number })).toBeVisible();

  // The search goes to the API and stays in the URL.
  await page.getByLabel("Buscar documentos").fill("Cliente Dos");
  await page.getByLabel("Buscar documentos").press("Enter");
  await expect(page).toHaveURL(/q=Cliente/);
  await expect(page.getByRole("link", { name: second.number })).toBeVisible();
  await expect(page.getByRole("link", { name: first.number })).toHaveCount(0);

  await page.getByRole("link", { name: second.number }).click();
  await expect(page).toHaveURL(new RegExp(`/documents/${second.id}$`));
  await expect(page.getByRole("heading", { name: `Factura ${second.number}` })).toBeVisible();
  await expect(page.getByText("Cliente Dos")).toBeVisible();
  await expect(page.getByText("Servicio de consultoría")).toBeVisible();
  await expect(page.getByText("Recibido por Cetus")).toBeVisible();
  await expect(page.getByRole("button", { name: "PDF" })).toBeVisible();
});

test("an unknown document shows a not found page", async ({ page, organization: _ }) => {
  await open(page, `/documents/${crypto.randomUUID()}`);

  await expect(page.getByText("Documento no encontrado")).toBeVisible();
});

test("the issuer links to its documents", async ({ page, organization }) => {
  const issuerId = await onboardIssuer(organization, "900123456", "Enlace SAS");

  await open(page, `/issuers/${issuerId}`);
  await page.getByRole("link", { name: "Ver los documentos de este emisor" }).click();

  await expect(page).toHaveURL(new RegExp(`/documents\\?issuerId=${issuerId}`));
  await expect(page.getByText("Solo los documentos de un emisor.")).toBeVisible();
});
