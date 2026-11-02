import {
  createApiKey,
  createIssuer,
  issueInvoice,
  sandboxIssuer,
  uniqueNit,
  waitForStatus,
} from "../support/issuers";
import { expect, open, test } from "./fixtures";

test("the overview shows how the period's documents went and the DIAN's rules", async ({
  page,
  organization,
}) => {
  const issuerId = await sandboxIssuer(organization);
  const key = await createApiKey(organization, "SANDBOX");
  const accepted = await issueInvoice(key, issuerId, "Cliente Aceptado");
  // The simulator rejects this customer with FAK26 and FAB10a, and notifies FAJ43b.
  const rejected = await issueInvoice(key, issuerId, "Cliente Rechazado", "1000000002");
  expect(await waitForStatus(organization, accepted.id)).toBe("ACCEPTED");
  expect(await waitForStatus(organization, rejected.id)).toBe("REJECTED");

  await open(page, "/overview");

  await expect(page.getByRole("heading", { name: "Documentos emitidos" })).toBeVisible();
  await expect(page.getByText(/^50\s?%$/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Aceptados: 1" })).toBeVisible();
  // The chart's days are also text, for screen readers.
  await expect(page.getByRole("figure").getByRole("listitem")).toContainText([
    /Aceptados 1, Rechazados 1, Fallidos 0, En curso 0$/,
  ]);
  // With a key, the account no longer needs the invitation to integrate.
  await expect(page.getByRole("heading", { name: "Integra tu sistema" })).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "FAK26" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "FAB10a" })).toBeVisible();
  await page.getByRole("tab", { name: "Notificaciones" }).click();
  await expect(page.getByRole("cell", { name: "FAJ43b" })).toBeVisible();

  await page.getByRole("combobox", { name: "Periodo" }).click();
  await page.getByRole("option", { name: "Últimos 7 días" }).click();
  await expect(page).toHaveURL(/period=last7/);
  await expect(page.getByRole("link", { name: "Rechazados: 1" })).toBeVisible();

  await page.getByRole("link", { name: "Rechazados: 1" }).click();
  await expect(page).toHaveURL(/\/documents\?.*status=REJECTED/);
  await expect(page.getByRole("link", { name: rejected.number })).toBeVisible();
  await expect(page.getByRole("link", { name: accepted.number })).toHaveCount(0);
});

test("a new organization sees its first invoice invitation instead of empty metrics", async ({
  page,
  organization: _owner,
}) => {
  await open(page, "/overview");

  await expect(page.getByText("Emite tu primera factura simulada")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Documentos emitidos" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Integra tu sistema" })).toBeVisible();
});

test("an issuer left halfway is resumed from the overview", async ({ page, organization }) => {
  const issuerId = await createIssuer(organization, uniqueNit(), "A Medias SAS");

  await open(page, "/overview");

  await expect(
    page.getByRole("heading", { name: "Termina de configurar A Medias SAS" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Continuar configuración" }).click();
  await expect(page).toHaveURL(new RegExp(`/setup\\?issuerId=${issuerId}`));
});
