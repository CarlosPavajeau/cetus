import { expect, open, test } from "./fixtures";

test("saved products and customers fill in the next invoice", async ({ page, organization: _ }) => {
  await open(page, "/catalog/products");
  await page.getByRole("button", { name: "Nuevo producto" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Código").fill("ALM-1");
  await dialog.getByLabel("Descripción").fill("Almuerzo ejecutivo");
  await dialog.getByLabel("Precio unitario").fill("25000");
  await dialog.getByRole("combobox", { name: "Impuesto" }).click();
  await page.getByRole("option", { name: "Impuesto al consumo 8 %" }).click();
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("cell", { name: "Almuerzo ejecutivo", exact: true })).toBeVisible();

  // The first sandbox invoice comes filled in; its customer is saved on the way.
  await open(page, "/documents/new");
  await page.getByLabel("Agregar un producto guardado").fill("almuerzo");
  await page.getByRole("option", { name: "ALM-1 · Almuerzo ejecutivo" }).click();
  await expect(page.getByLabel("Descripción de la línea 2")).toHaveValue("Almuerzo ejecutivo");
  await page
    .getByRole("checkbox", { name: "Guardar este cliente para la próxima factura" })
    .click();
  await page.getByRole("button", { name: "Emitir factura" }).click();
  await expect(page.getByRole("heading", { name: /^Factura SIM\d+$/ })).toBeVisible();

  await open(page, "/catalog/customers");
  await expect(
    page.getByRole("cell", { name: "Cliente de Ejemplo SAS", exact: true }),
  ).toBeVisible();

  // The next invoice starts empty and takes the saved customer.
  await open(page, "/documents/new");
  await expect(page.getByLabel("Nombre o razón social")).toHaveValue("");
  await page.getByLabel("Cliente guardado").fill("ejemplo");
  await page.getByRole("option", { name: /^Cliente de Ejemplo SAS/ }).click();
  await expect(page.getByLabel("Nombre o razón social")).toHaveValue("Cliente de Ejemplo SAS");
  await expect(page.getByLabel("Número")).toHaveValue(/^901234567-\d$/);

  await open(page, "/catalog/products");
  await page.getByRole("button", { name: "Eliminar Almuerzo ejecutivo" }).click();
  await expect(page.getByText("Aún no tienes productos guardados")).toBeVisible();
});
