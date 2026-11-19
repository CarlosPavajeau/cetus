import type { Page } from "@playwright/test";
import { type } from "arktype";

import { columns } from "~/features/batches/columns";
import type { ProductRequest } from "~/lib/api/types";

import { onboardIssuer, uniqueNit } from "../support/issuers";
import type { TestOrganization } from "../support/organization";
import { zip } from "../support/zip";
import { expect, open, test } from "./fixtures";

type Row = Partial<Record<(typeof columns)[number]["header"], string>>;

function quote(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** A CSV with the template's columns, as another system would export it. */
function csv(rows: Row[]) {
  return [
    columns.map((column) => quote(column.header)).join(","),
    ...rows.map((row) => columns.map((column) => quote(row[column.header] ?? "")).join(",")),
  ].join("\r\n");
}

function customer(legalName: string): Row {
  return {
    "Tipo de identificación": "NIT",
    "Número de identificación": uniqueNit(),
    "Tipo de persona": "Persona jurídica",
    "Nombre o razón social": legalName,
    "Responsabilidad fiscal": "No aplica – Otros (R-99-PN)",
    "Régimen de IVA": "Responsable de IVA",
    "Forma de pago": "De contado",
    "Medio de pago": "Transferencia bancaria",
  };
}

async function upload(page: Page, rows: Row[]) {
  await page.getByLabel("Archivo de facturas").setInputFiles({
    name: "facturas.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv(rows), "utf-8"),
  });
}

const batchView = type({
  status: "string",
  items: "number",
  counts: { accepted: "number", rejected: "number", failed: "number", pending: "number" },
});

/** The organization's newest batch in TEST, once it reaches a final status. */
async function waitForBatch(
  organization: TestOrganization,
  attemptsLeft = 120,
): Promise<typeof batchView.infer> {
  const response = await organization.api("/console/document-batches?environment=TEST&limit=1");
  const { items } = type({ items: batchView.array() }).assert(await response.json());
  const batch = items[0];
  if (batch !== undefined && !["RECEIVED", "EXPANDING", "PROCESSING"].includes(batch.status)) {
    return batch;
  }
  if (attemptsLeft <= 1) {
    throw new Error(`The batch is still ${batch?.status ?? "missing"}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  return waitForBatch(organization, attemptsLeft - 1);
}

test("a file of three invoices, one of two lines and one from the catalog, is issued in full", async ({
  page,
  organization,
}) => {
  test.setTimeout(120_000);
  await onboardIssuer(organization, uniqueNit(), "Lote Completo SAS", { testSet: false });
  const product: ProductRequest = {
    code: "ARR-LOCAL",
    description: "Arriendo local comercial",
    unitCode: "MON",
    unitPrice: 2_500_000,
    taxes: [{ type: "IVA", percent: 19 }],
  };
  const created = await organization.api("/console/products?environment=TEST", {
    method: "POST",
    body: JSON.stringify(product),
  });
  expect(created.status).toBe(201);

  await open(page, "/documents");
  await page.getByRole("link", { name: "Emitir desde Excel" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar la plantilla (.xlsx)" }).click();
  expect((await download).suggestedFilename()).toBe("facturas-v1.xlsx");

  const line = { Cantidad: "1", "Precio unitario": "100000", IVA: "IVA 19 %" };
  await upload(page, [
    { ...customer("Cliente Uno SAS"), ...line, Referencia: "L-1", Descripción: "Asesoría" },
    { ...line, Referencia: "L-1", Descripción: "Soporte", IVA: "Excluido de IVA" },
    { ...customer("Cliente Dos SAS"), ...line, Referencia: "L-2", Descripción: "Licencia" },
    {
      ...customer("Cliente Tres SAS"),
      Referencia: "L-3",
      "Código de producto": product.code,
      Cantidad: "1",
    },
  ]);

  await expect(page.getByText("sin lo que completa el catálogo")).toBeVisible();
  await page.getByRole("button", { name: "Emitir 3 facturas" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Emitir", exact: true }).click();
  await expect(page).toHaveURL(/\/documents$/);

  expect(await waitForBatch(organization)).toMatchObject({
    status: "COMPLETED",
    items: 3,
    counts: { accepted: 3, rejected: 0, failed: 0, pending: 0 },
  });
});

test("the invoices with errors are left out and the rest are issued", async ({
  page,
  organization,
}) => {
  test.setTimeout(120_000);
  await onboardIssuer(organization, uniqueNit(), "Lote Parcial SAS", { testSet: false });

  await open(page, "/documents/batches/new");
  const line = { Descripción: "Asesoría", Cantidad: "1", "Precio unitario": "50000" };
  await upload(page, [
    { ...customer("Cliente Uno SAS"), ...line, Referencia: "E-1" },
    { ...customer("Cliente Dos SAS"), ...line, Referencia: "E-2", "Medio de pago": "" },
    { ...customer("Cliente Tres SAS"), ...line, Referencia: "E-3" },
  ]);

  await expect(page.getByText("1 factura tiene errores")).toBeVisible();
  await expect(
    page.getByRole("row", { name: "3 Medio de pago Este dato es obligatorio." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Emitir 2 facturas" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Emitir 2 facturas" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Emitir", exact: true }).click();
  await expect(page).toHaveURL(/\/documents$/);

  expect(await waitForBatch(organization)).toMatchObject({
    status: "COMPLETED",
    items: 2,
    counts: { accepted: 2, rejected: 0, failed: 0, pending: 0 },
  });
});

const xml = (text: string) => Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>${text}`, "utf-8");

/** An .xlsx of a few hundred kilobytes whose sheet unzips to hundreds of megabytes. */
function zipBomb() {
  const main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const relationships = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  return zip([
    {
      name: "[Content_Types].xml",
      data: xml(
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
      ),
    },
    {
      name: "_rels/.rels",
      data: xml(
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relationships}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      ),
    },
    {
      name: "xl/workbook.xml",
      data: xml(
        `<workbook xmlns="${main}" xmlns:r="${relationships}"><sheets><sheet name="Facturas" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: xml(
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relationships}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
      ),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: Buffer.concat([
        xml(`<worksheet xmlns="${main}"><sheetData>`),
        Buffer.alloc(400 * 1024 * 1024, " "),
        Buffer.from("</sheetData></worksheet>"),
      ]),
    },
  ]);
}

test("a file that unzips to an enormous sheet is stopped without taking the page down", async ({
  page,
  organization,
}) => {
  test.setTimeout(120_000);
  await onboardIssuer(organization, uniqueNit(), "Lote Bomba SAS", { testSet: false });
  const bomb = zipBomb();
  expect(bomb.length).toBeLessThan(5 * 1024 * 1024);

  await open(page, "/documents/batches/new");
  await page.getByLabel("Archivo de facturas").setInputFiles({
    name: "bomba.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: bomb,
  });

  await expect(page.getByText("No pudimos usar este archivo")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Elegir otro archivo" })).toBeEnabled();
});
