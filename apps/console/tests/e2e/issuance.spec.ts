import { type } from "arktype";

import { grantPackage } from "../support/credits";
import {
  addCreditNoteRange,
  addRange,
  createTestApiKey,
  issueInvoice,
  onboardIssuer,
  uniqueNit,
  waitForStatus,
} from "../support/issuers";
import { expect, open, test } from "./fixtures";

test("a new organization issues its first simulated invoice from the overview", async ({
  page,
  organization: _,
}) => {
  await open(page, "/overview");
  await expect(page.getByRole("complementary", { name: "Modo simulación" })).toBeVisible();
  await page.getByRole("link", { name: "Emitir factura simulada" }).click();

  // Everything comes filled in; the totals come from the API.
  await expect(page.getByLabel("Descripción de la línea 1")).toHaveValue("Asesoría contable");
  const totals = page.getByRole("definition").filter({ hasText: "119.000" });
  await expect(totals.first()).toBeVisible();
  await page.getByRole("button", { name: "Emitir factura" }).click();

  await expect(page.getByRole("heading", { name: /^Factura SIM\d+$/ })).toBeVisible();
  // The page refreshes itself until the simulator answers.
  await expect(page.getByText("El simulador de Cetus lo aceptó")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Descargar" }).click();
  await expect(page.getByRole("menuitem", { name: "PDF" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "XML" })).toBeVisible();
});

test("an invoice is filled in by hand in habilitación", async ({ page, organization }) => {
  await onboardIssuer(organization, uniqueNit(), "Manual SAS", { testSet: false });

  // An issuer in habilitación makes TEST the starting environment.
  await open(page, "/documents/new");
  await expect(page.getByRole("combobox", { name: "Ambiente" })).toHaveText(/Pruebas/);
  // A single issuer needs no choosing: the summary names it.
  await expect(page.getByRole("complementary", { name: "Resumen de la factura" })).toContainText(
    "Manual SAS",
  );

  await page.getByLabel("Número").fill("900123456-1");
  await expect(page.getByText("Dígito de verificación: 8")).toBeVisible();
  await page.getByRole("button", { name: "Emitir factura" }).click();
  // The first invalid field takes the focus and describes its error.
  await expect(page.getByLabel("Nombre o razón social")).toBeFocused();
  await expect(page.getByLabel("Nombre o razón social")).toHaveAccessibleDescription(
    "Escribe el nombre o la razón social.",
  );

  await page.getByLabel("Nombre o razón social").fill("Comprador SAS");
  await page.getByLabel("Descripción de la línea 1").fill("Licencia anual");
  await page.getByLabel("Precio unitario de la línea 1").fill("50000");
  await page.getByRole("button", { name: "Emitir factura" }).click();
  await expect(page.getByText("El dígito de verificación de ese NIT es 8.")).toBeVisible();
  await page.getByLabel("Número").fill("900123456");
  await page.getByRole("button", { name: "Agregar línea" }).click();
  await page.getByLabel("Descripción de la línea 2").fill("Libro");
  await page.getByLabel("Precio unitario de la línea 2").fill("20000");
  await page.getByRole("combobox", { name: "Impuesto de la línea 2" }).click();
  await page.getByRole("option", { name: "Excluido de IVA" }).click();
  // 50.000 + 19 % of IVA, plus 20.000 without tax.
  await expect(page.getByRole("definition").filter({ hasText: "79.500" })).toBeVisible();
  await page.getByRole("button", { name: "Emitir factura" }).click();

  await expect(page.getByRole("heading", { name: /^Factura SETP\d+$/ })).toBeVisible();
  await expect(page.getByText("Comprador SAS")).toBeVisible();
  await expect(page.getByText("La DIAN de pruebas lo validó")).toBeVisible({ timeout: 20_000 });
});

test("a production invoice asks for confirmation before it is issued", async ({
  page,
  organization,
}) => {
  const testIssuerId = await onboardIssuer(organization, uniqueNit(), "Produccion SAS", {
    testSet: false,
  });
  await grantPackage(organization);
  const promoted = await organization.api(`/console/issuers/${testIssuerId}/promote`, {
    method: "POST",
  });
  const { id: liveIssuerId } = type({ id: "string" }).assert(await promoted.json());
  await addRange(organization, liveIssuerId, "FE");

  await open(page, "/documents/new");
  await expect(page.getByRole("combobox", { name: "Ambiente" })).toHaveText(/Producción/);
  await expect(page.getByRole("complementary", { name: "Modo simulación" })).toHaveCount(0);
  await page.getByRole("button", { name: "Venta a consumidor final" }).click();
  await page.getByLabel("Descripción de la línea 1").fill("Almuerzo");
  await page.getByLabel("Precio unitario de la línea 1").fill("30000");
  await page.getByRole("combobox", { name: "Impuesto de la línea 1" }).click();
  await page.getByRole("option", { name: "Impuesto al consumo 8 %" }).click();
  await page.getByRole("button", { name: "Emitir factura" }).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByText("¿Emitir esta factura en producción?")).toBeVisible();
  await expect(dialog.getByText("Consumidor final · 222222222222")).toBeVisible();
  await expect(dialog.getByText("32.400")).toBeVisible();
  await dialog.getByRole("button", { name: "Revisar" }).click();
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "Emitir factura" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Emitir en producción" }).click();
  await expect(page.getByRole("heading", { name: /^Factura FE\d+$/ })).toBeVisible();
});

test("an accepted invoice is corrected with a partial credit note", async ({
  page,
  organization,
}) => {
  const issuerId = await onboardIssuer(organization, uniqueNit(), "Notas SAS", { testSet: false });
  await addCreditNoteRange(organization, issuerId);
  const invoice = await issueInvoice(
    await createTestApiKey(organization),
    issuerId,
    "Cliente Notas",
  );
  expect(await waitForStatus(organization, invoice.id)).toBe("ACCEPTED");

  await open(page, `/documents/${invoice.id}`);
  await page.getByRole("button", { name: "Corregir factura" }).click();
  await page.getByRole("menuitem", { name: "Nota crédito" }).click();
  await expect(page.getByRole("heading", { name: "Emitir nota crédito" })).toBeVisible();
  await expect(page.getByText("Puedes acreditar hasta $ 119.000")).toBeVisible();
  await page.getByLabel("Descripción", { exact: true }).fill("Descuento acordado con el cliente");
  await page.getByLabel("Descripción de la línea 1").fill("Descuento");
  await page.getByLabel("Precio unitario de la línea 1").fill("10000");
  await expect(page.getByRole("definition").filter({ hasText: "11.900" })).toBeVisible();
  await page.getByRole("button", { name: "Emitir nota crédito" }).click();

  await expect(page.getByRole("heading", { name: /^Nota crédito NC\d+$/ })).toBeVisible();
  await expect(page.getByText("Descuento acordado con el cliente")).toBeVisible();
});

test("an accepted invoice is emailed again at most once a minute", async ({
  page,
  organization,
}) => {
  const issuerId = await onboardIssuer(organization, uniqueNit(), "Reenvio SAS", {
    testSet: false,
  });
  const invoice = await issueInvoice(
    await createTestApiKey(organization),
    issuerId,
    "Cliente Reenvio",
  );
  expect(await waitForStatus(organization, invoice.id)).toBe("ACCEPTED");

  await open(page, `/documents/${invoice.id}`);
  const deliveries = page.getByRole("region", { name: "Entrega al cliente" });
  // Enabled once the first delivery is over; the page refreshes itself until then.
  await deliveries.getByRole("button", { name: "Reenviar correo" }).click({ timeout: 20_000 });
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Enviar a").fill("contabilidad");
  await dialog.getByRole("button", { name: "Reenviar" }).click();
  await expect(dialog.getByText("Escribe un correo válido.")).toBeVisible();
  await dialog.getByLabel("Enviar a").fill("contabilidad@cliente.test");
  await dialog.getByRole("button", { name: "Reenviar" }).click();

  // The first delivery just ended; the API and worker tests cover a resend that goes out.
  await expect(
    dialog.getByText("Acabamos de enviarlo. Espera un minuto antes de reenviarlo."),
  ).toBeVisible();
});

test("the customer's location is optional as a whole", async ({ page, organization: _ }) => {
  // The first sandbox invoice comes with Bogotá and an address.
  await open(page, "/documents/new");
  await page.getByRole("button", { name: "Editar datos" }).click();
  await expect(page.getByRole("combobox", { name: "Tipo de persona" })).toBeFocused();
  await page.getByLabel("Dirección (opcional)").fill("");
  await page.getByRole("button", { name: "Emitir factura" }).click();
  await expect(
    page.getByText("Escribe la dirección, o quita el municipio para no indicar ubicación."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Quitar el municipio" }).click();
  await expect(page.getByLabel("Municipio (opcional)")).toHaveValue("");
  await page.getByRole("button", { name: "Emitir factura" }).click();
  await expect(page.getByRole("heading", { name: /^Factura SIM\d+$/ })).toBeVisible();
});
