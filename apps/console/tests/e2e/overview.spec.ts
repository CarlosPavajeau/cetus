import {
  createApiKey,
  createIssuer,
  createTestApiKey,
  issueInvoice,
  onboardIssuer,
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
  await expect(page.getByText(/^1 de 2$/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Aceptados 1" })).toBeVisible();
  await expect(
    page.getByText(/^Todos los documentos del periodo son del .+\. La gráfica por día aparece/),
  ).toBeVisible();
  // With a key, the account no longer needs the invitation to integrate.
  await expect(page.getByRole("heading", { name: "Integra tu sistema" })).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "FAK26" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "FAB10a" })).toBeVisible();
  await page.getByRole("tab", { name: "Notificaciones" }).click();
  await expect(page.getByRole("cell", { name: "FAJ43b" })).toBeVisible();

  await page.getByRole("combobox", { name: "Periodo" }).click();
  await page.getByRole("option", { name: "Últimos 7 días" }).click();
  await expect(page).toHaveURL(/period=last7/);
  await expect(page.getByRole("link", { name: "Rechazados 1" })).toBeVisible();

  await page.getByRole("link", { name: "Rechazados 1" }).click();
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

test("an environment whose only issuer is in habilitación points to finishing it", async ({
  page,
  organization,
}) => {
  const issuerId = await createIssuer(organization, uniqueNit(), "En Camino SAS");

  await open(page, "/overview");
  await page.getByRole("combobox", { name: "Ambiente" }).click();
  await page.getByRole("option", { name: "Pruebas" }).click();

  const activity = page.getByRole("region", { name: "Documentos emitidos" });
  await expect(
    activity.getByText("Termina la habilitación de En Camino SAS para emitir en pruebas"),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Periodo" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Emitir factura" })).toHaveCount(0);
  await activity.getByRole("link", { name: "Continuar habilitación" }).click();
  await expect(page).toHaveURL(new RegExp(`/setup\\?issuerId=${issuerId}`));
});

test("with many issuers, the overview finds one by its NIT", async ({ page, organization }) => {
  const issuerId = await onboardIssuer(organization, uniqueNit(), "Principal SAS", {
    testSet: false,
  });
  const invoice = await issueInvoice(await createTestApiKey(organization), issuerId, "Cliente");
  expect(await waitForStatus(organization, invoice.id)).toBe("ACCEPTED");
  const nit = uniqueNit();
  const soughtId = await createIssuer(organization, nit, "Buscada SAS");
  await Promise.all(
    ["Otra Uno SAS", "Otra Dos SAS", "Otra Tres SAS", "Otra Cuatro SAS"].map((name) =>
      createIssuer(organization, uniqueNit(), name),
    ),
  );

  await open(page, "/overview");
  await page.getByRole("combobox", { name: "Ambiente" }).click();
  await page.getByRole("option", { name: "Pruebas" }).click();
  const search = page.getByRole("combobox", { name: "Emisor" });
  await search.click();
  await expect(page.getByRole("option")).toHaveCount(6);
  await expect(page.getByRole("option", { name: /Buscada SAS/ })).toContainText(nit);
  await search.fill(nit.slice(0, 6));
  await expect(page.getByRole("option")).toHaveCount(1);
  await page.getByRole("option", { name: /Buscada SAS/ }).click();

  await expect(page).toHaveURL(new RegExp(`issuer=${soughtId}`));
  await expect(search).toHaveValue("Buscada SAS");
});
