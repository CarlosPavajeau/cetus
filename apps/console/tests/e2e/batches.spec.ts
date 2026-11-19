import { columns } from "~/features/batches/columns";

import { onboardIssuer, uniqueNit } from "../support/issuers";
import { expect, open, test } from "./fixtures";

const headers = columns.map((column) => column.header);

/** A CSV of the template's columns, separated by semicolons as Excel in Spanish exports it. */
function csv(rows: Record<string, string>[]) {
  const lines = rows.map((values) => headers.map((header) => values[header] ?? "").join(";"));
  return Buffer.from(`﻿${[headers.join(";"), ...lines].join("\r\n")}`, "utf-8");
}

const customer = {
  "Tipo de identificación": "NIT",
  "Número de identificación": "900123456",
  "Tipo de persona": "Persona jurídica",
  "Nombre o razón social": "Inmobiliaria Andina SAS",
  "Régimen de IVA": "Responsable de IVA",
  "Forma de pago": "De contado",
  "Medio de pago": "Transferencia bancaria",
};

test("a batch from a file is issued and followed until it completes", async ({
  page,
  organization,
}) => {
  await onboardIssuer(organization, uniqueNit(), "Lotes SAS", { testSet: false });
  await organization.api("/console/products?environment=TEST", {
    method: "POST",
    body: JSON.stringify({
      code: "ADM-1",
      description: "Cuota de administración",
      unitPrice: 350000,
      taxes: [],
    }),
  });

  await open(page, "/documents/batches/new");
  const template = await page.request.get(
    (await page
      .getByRole("link", { name: "Descargar la plantilla (.xlsx)" })
      .getAttribute("href")) ?? "",
  );
  expect(template.ok()).toBe(true);

  await page.getByLabel("Archivo de facturas").setInputFiles({
    name: "noviembre.csv",
    mimeType: "text/csv",
    buffer: csv([
      {
        ...customer,
        Referencia: "ARR-1",
        Descripción: "Arriendo",
        Cantidad: "1",
        "Precio unitario": "2500000",
        IVA: "IVA 19 %",
      },
      {
        Referencia: "ARR-1",
        Descripción: "Parqueadero",
        Cantidad: "1",
        "Precio unitario": "150000",
        IVA: "IVA 19 %",
      },
      { ...customer, Referencia: "ARR-2", "Código de producto": "ADM-1", Cantidad: "1" },
      {
        ...customer,
        Referencia: "ARR-3",
        Descripción: "Arriendo",
        Cantidad: "1,5",
        "Precio unitario": "1000000",
      },
    ]),
  });
  await expect(page.getByRole("definition").filter({ hasText: /^3$/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "Emitir 3 facturas" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Emitir" }).click();

  await expect(page.getByRole("heading", { name: "noviembre.csv" })).toBeVisible();
  await expect(page.getByText("Terminado")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("link", { name: /^SETP\d+$/ })).toHaveCount(3);
  await expect(page.getByRole("cell", { name: "ARR-2" })).toBeVisible();
});

test("the invoices with errors are excluded and the others are issued", async ({
  page,
  organization,
}) => {
  await onboardIssuer(organization, uniqueNit(), "Lotes Errores SAS", { testSet: false });

  await open(page, "/documents/batches/new");
  await page.getByLabel("Archivo de facturas").setInputFiles({
    name: "con-errores.csv",
    mimeType: "text/csv",
    buffer: csv([
      {
        ...customer,
        Referencia: "OK-1",
        Descripción: "Servicio",
        Cantidad: "1",
        "Precio unitario": "100000",
        IVA: "IVA 19 %",
      },
      {
        ...customer,
        Referencia: "MAL-1",
        Descripción: "Servicio",
        Cantidad: "cero",
        "Precio unitario": "100000",
      },
      {
        ...customer,
        Referencia: "MAL-2",
        "Nombre o razón social": "<b>Cliente</b>",
        "Medio de pago": "",
      },
    ]),
  });

  await expect(page.getByText("2 facturas tienen errores")).toBeVisible();
  await expect(page.getByRole("row", { name: /^3 Cantidad Escribe el número/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /^4 Medio de pago / })).toBeVisible();
  await expect(page.getByRole("button", { name: "Emitir 1 factura" })).toBeDisabled();

  await page.getByText("Excluir las 2 facturas con errores").click();
  await page.getByRole("button", { name: "Emitir 1 factura" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Emitir" }).click();

  await expect(page.getByRole("heading", { name: "con-errores.csv" })).toBeVisible();
  await expect(page.getByText("Terminado")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("link", { name: /^SETP\d+$/ })).toHaveCount(1);
});
