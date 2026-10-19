import {
  addCreditNoteRange,
  createTestApiKey,
  issueInvoice,
  onboardIssuer,
  uniqueNit,
  waitForStatus,
} from "../support/issuers";
import { expect, open, test } from "./fixtures";

test("the documents page lists the invoices and opens their detail", async ({
  page,
  organization,
}) => {
  const issuerId = await onboardIssuer(organization, uniqueNit(), "Documentos SAS");
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
  const issuerId = await onboardIssuer(organization, uniqueNit(), "Enlace SAS");

  await open(page, `/issuers/${issuerId}`);
  await page.getByRole("link", { name: "Ver los documentos de este emisor" }).click();

  await expect(page).toHaveURL(new RegExp(`/documents\\?issuerId=${issuerId}`));
  await expect(page.getByText("Solo los documentos de un emisor.")).toBeVisible();
});

test("an accepted invoice is cancelled from its detail with a credit note", async ({
  page,
  organization,
}) => {
  const issuerId = await onboardIssuer(organization, uniqueNit(), "Anulaciones SAS", {
    testSet: false,
  });
  await addCreditNoteRange(organization, issuerId);
  const apiKey = await createTestApiKey(organization);
  const invoice = await issueInvoice(apiKey, issuerId, "Cliente Anulado");
  expect(await waitForStatus(organization, invoice.id)).toBe("ACCEPTED");

  await open(page, `/documents/${invoice.id}`);
  await page.getByRole("button", { name: "Anular factura" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByText(`¿Anular la factura ${invoice.number}?`)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Emitir nota de anulación" })).toBeDisabled();
  await dialog.getByLabel("Motivo").fill("Error en el valor facturado");
  await dialog.getByRole("button", { name: "Emitir nota de anulación" }).click();

  await expect(page.getByRole("heading", { name: /^Nota crédito NC/ })).toBeVisible();
  await expect(page.getByText("Error en el valor facturado")).toBeVisible();
  await page.getByRole("link", { name: invoice.number }).click();

  await expect(page.getByRole("heading", { name: `Factura ${invoice.number}` })).toBeVisible();
  await expect(page.getByRole("link", { name: /^NC/ })).toBeVisible();
  // Nothing is left to credit, so the cancellation is no longer offered.
  await expect(page.getByRole("button", { name: "Anular factura" })).toBeDisabled();
});
