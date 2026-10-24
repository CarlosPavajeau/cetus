import { addRange, onboardIssuer, uniqueNit } from "../support/issuers";
import { expect, open, test } from "./fixtures";

test("a new organization issues its first simulated invoice from the overview", async ({
  page,
  organization: _,
}) => {
  await open(page, "/overview");
  await expect(page.getByRole("complementary", { name: "Modo simulación" })).toBeVisible();
  await page.getByRole("button", { name: "Emitir factura de prueba" }).click();

  // Everything comes filled in; the totals come from the API.
  await expect(page.getByLabel("Descripción de la línea 1")).toHaveValue("Asesoría contable");
  const totals = page.getByRole("definition").filter({ hasText: "119.000" });
  await expect(totals.first()).toBeVisible();
  await page.getByRole("button", { name: "Emitir factura" }).click();

  await expect(page.getByRole("heading", { name: /^Factura SIM\d+$/ })).toBeVisible();
  // The page refreshes itself until the simulator answers.
  await expect(page.getByText("El simulador de Cetus lo aceptó")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "PDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "XML" })).toBeVisible();
});

test("an invoice is filled in by hand in habilitación", async ({ page, organization }) => {
  await onboardIssuer(organization, uniqueNit(), "Manual SAS", { testSet: false });

  // An issuer in habilitación makes TEST the starting environment.
  await open(page, "/documents/new");
  await expect(page.getByRole("combobox", { name: "Ambiente" })).toHaveText(/Pruebas/);
  await expect(page.getByRole("combobox", { name: "Empresa que factura" })).toHaveText(
    /Manual SAS/,
  );

  await page.getByLabel("Número").fill("900123456-1");
  await expect(page.getByText("Dígito de verificación: 8")).toBeVisible();
  await page.getByRole("button", { name: "Emitir factura" }).click();
  await expect(page.getByText("Escribe el nombre o la razón social.")).toBeVisible();

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
  const promoted = await organization.api(`/console/issuers/${testIssuerId}/promote`, {
    method: "POST",
  });
  const { id: liveIssuerId } = (await promoted.json()) as { id: string };
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
