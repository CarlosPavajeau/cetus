import {
  createTestApiKey,
  issueInvoice,
  onboardIssuer,
  uniqueNit,
  waitForStatus,
} from "../support/issuers";
import { expect, open, test } from "./fixtures";

test("a webhook is registered, shows its secret once, and is disabled and enabled again", async ({
  page,
  organization: _,
}) => {
  await open(page, "/developers/webhooks");
  await expect(page.getByText("Aún no tienes webhooks")).toBeVisible();

  await page.getByRole("button", { name: "Registrar webhook" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("URL").fill("https://erp.example.com/webhooks/cetus");
  await dialog.getByLabel("Descripción (opcional)").fill("ERP de pruebas");
  await dialog.getByRole("checkbox", { name: "Factura aceptada" }).click();
  await dialog.getByRole("button", { name: "Registrar webhook" }).click();

  await expect(dialog.getByText("Copia el secreto de firma ahora")).toBeVisible();
  await expect(dialog.getByLabel("Secreto de firma")).toHaveValue(/^whsec_/);
  await dialog.getByRole("button", { name: "Listo" }).click();

  const row = page.getByRole("row", { name: /erp\.example\.com/ });
  await expect(row.getByText("Factura aceptada")).toBeVisible();
  await expect(row.getByText("Activo")).toBeVisible();

  await row.getByRole("link", { name: "https://erp.example.com/webhooks/cetus" }).click();
  await expect(page.getByRole("heading", { name: "erp.example.com" })).toBeVisible();
  await expect(page.getByText("Todavía no hay envíos.")).toBeVisible();

  await page.getByRole("button", { name: "Desactivar" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Desactivar" }).click();
  await expect(page.getByText("Desactivado", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Reactivar" }).click();
  await expect(page.getByText("Activo", { exact: true })).toBeVisible();
});

test("a LIVE webhook over http is refused", async ({ page, organization: _ }) => {
  await open(page, "/developers/webhooks");
  await page.getByRole("button", { name: "Registrar webhook" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("URL").fill("http://erp.example.com/webhooks/cetus");
  await dialog.getByLabel("Ambiente").click();
  await page.getByRole("option", { name: "Producción" }).click();
  await dialog.getByRole("button", { name: "Registrar webhook" }).click();

  await expect(dialog.getByText(/En producción debe usar https/)).toBeVisible();
});

test("the deliveries of a document event show up in the endpoint's history", async ({
  page,
  organization,
}) => {
  // Nothing listens on port 9: the delivery fails and stays in the history with its error.
  const created = await organization.api("/console/webhook-endpoints", {
    method: "POST",
    body: JSON.stringify({ url: "http://127.0.0.1:9/hook", environment: "TEST" }),
  });
  const { endpoint } = (await created.json()) as { endpoint: { id: string } };
  const issuerId = await onboardIssuer(organization, uniqueNit(), "Avisos SAS", { testSet: false });
  const invoice = await issueInvoice(await createTestApiKey(organization), issuerId, "Cliente");
  expect(await waitForStatus(organization, invoice.id)).toBe("ACCEPTED");

  await open(page, `/developers/webhooks/${endpoint.id}`);
  const row = page.getByRole("row", { name: /Factura aceptada/ });
  await expect(row).toBeVisible();
  await row.getByRole("link", { name: "Ver documento" }).click();
  await expect(page).toHaveURL(new RegExp(`/documents/${invoice.id}$`));
});
