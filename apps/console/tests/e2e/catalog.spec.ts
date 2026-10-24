import type { InvoiceRequest, ProductRequest } from "~/lib/api/types";

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
  // The list is searched on the server.
  await page.getByLabel("Buscar por nombre o documento").fill("nadie");
  await expect(page.getByText("Ningún resultado para «nadie».")).toBeVisible();
  await page.getByLabel("Buscar por nombre o documento").fill("9012345");
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

test("a customer the form cannot hold is listed but cannot be picked", async ({
  page,
  organization,
}) => {
  const foreign: InvoiceRequest["customer"] = {
    personType: "LEGAL_ENTITY",
    identificationType: "FOREIGN_NIT",
    identificationNumber: "EX-778899",
    legalName: "Importadora Extranjera Inc",
  };
  const response = await organization.api("/console/customers?environment=SANDBOX", {
    method: "POST",
    body: JSON.stringify(foreign),
  });
  expect(response.status).toBe(201);

  // Editing it here would drop what the form does not show.
  await open(page, "/catalog/customers");
  await expect(
    page.getByRole("button", { name: "Editar Importadora Extranjera Inc" }),
  ).toBeDisabled();

  await open(page, "/documents/new");
  await page.getByLabel("Cliente guardado").fill("importadora");
  const option = page.getByRole("option", { name: /Importadora Extranjera Inc/ });
  await expect(option).toContainText("solo por API");
  await expect(option).toHaveAttribute("aria-disabled", "true");
});

test("a customer is created and edited without issuing an invoice", async ({
  page,
  organization: _,
}) => {
  await open(page, "/catalog/customers");
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Número").fill("800197268");
  await expect(dialog.getByText("Dígito de verificación: 4 (lo calculamos por ti)")).toBeVisible();
  await dialog.getByLabel("Nombre o razón social").fill("Distribuidora Andina SAS");
  await dialog.getByLabel("Municipio (opcional)").fill("Medell");
  await page.getByRole("option", { name: /^Medellín/ }).click();
  await dialog.getByLabel("Dirección (opcional)").fill("Carrera 43A # 1-50");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("cell", { name: "NIT 800197268-4" })).toBeVisible();

  // The same document cannot be saved twice.
  await page.getByRole("button", { name: "Nuevo cliente" }).click();
  await dialog.getByLabel("Número").fill("800197268-4");
  await dialog.getByLabel("Nombre o razón social").fill("Otra Distribuidora SAS");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog.getByText("Ya tienes un cliente con ese documento.")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();

  await page.getByRole("button", { name: "Editar Distribuidora Andina SAS" }).click();
  await expect(dialog.getByLabel("Municipio (opcional)")).toHaveValue("Medellín, Antioquia");
  await dialog.getByLabel("Nombre o razón social").fill("Distribuidora Andina del Norte SAS");
  await dialog.getByLabel("Correo (opcional)").fill("compras@andina.test");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(
    page.getByRole("cell", { name: "Distribuidora Andina del Norte SAS", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "compras@andina.test" })).toBeVisible();

  await open(page, "/documents/new");
  await page.getByLabel("Cliente guardado").fill("andina");
  await page.getByRole("option", { name: /^Distribuidora Andina del Norte SAS/ }).click();
  await expect(page.getByLabel("Correo (opcional)")).toHaveValue("compras@andina.test");
  await expect(page.getByLabel("Dirección (opcional)")).toHaveValue("Carrera 43A # 1-50");
});

test("editing a customer keeps what the form does not show", async ({ page, organization }) => {
  const saved: InvoiceRequest["customer"] = {
    personType: "NATURAL_PERSON",
    identificationType: "CITIZEN_ID",
    identificationNumber: "1020304050",
    legalName: "Laura Gómez",
    tradeName: "Panadería La Espiga",
    phone: "3001234567",
  };
  const created = await organization.api("/console/customers?environment=SANDBOX", {
    method: "POST",
    body: JSON.stringify(saved),
  });
  expect(created.status).toBe(201);

  await open(page, "/catalog/customers");
  await page.getByRole("button", { name: "Editar Laura Gómez" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre o razón social").fill("Laura Gómez Ruiz");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("cell", { name: "Laura Gómez Ruiz", exact: true })).toBeVisible();

  const listed = await organization.api("/console/customers?environment=SANDBOX&q=1020304050");
  expect(await listed.json()).toMatchObject({
    items: [{ legalName: "Laura Gómez Ruiz", tradeName: saved.tradeName, phone: saved.phone }],
  });
});

test("a product is edited and keeps its unit", async ({ page, organization }) => {
  const coffee: ProductRequest = {
    code: "CAF-1",
    description: "Café en grano",
    unitCode: "KGM",
    unitPrice: 42000,
    taxes: [{ type: "IVA", percent: 5 }],
  };
  const created = await organization.api("/console/products?environment=SANDBOX", {
    method: "POST",
    body: JSON.stringify(coffee),
  });
  expect(created.status).toBe(201);

  await open(page, "/catalog/products");
  await page.getByRole("button", { name: "Editar Café en grano" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Precio unitario")).toHaveValue("42000");
  await dialog.getByLabel("Precio unitario").fill("45000");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("cell", { name: /45\.000/ })).toBeVisible();

  const listed = await organization.api("/console/products?environment=SANDBOX&q=CAF-1");
  expect(await listed.json()).toMatchObject({
    items: [{ code: "CAF-1", unitCode: "KGM", unitPrice: 45000 }],
  });
});
