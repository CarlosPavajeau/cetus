import type { Page } from "@playwright/test";

import { columns } from "~/features/batches/columns";

import { expect, open as openPage, test } from "../e2e/fixtures";
import { markEmailVerified } from "../support/invitations";
import { onboardIssuer, uniqueNit } from "../support/issuers";

const directory = new URL("../../../docs/public/images/consola/", import.meta.url).pathname;

const headers = columns.map((column) => column.header);

type Row = Partial<Record<(typeof headers)[number], string>>;

function csv(rows: Row[]) {
  const lines = rows.map((values) => headers.map((header) => values[header] ?? "").join(";"));
  return Buffer.from(`﻿${[headers.join(";"), ...lines].join("\r\n")}`, "utf-8");
}

const tenants = [
  ["Inmobiliaria Andina SAS", 2_500_000],
  ["Café La Montaña SAS", 1_800_000],
  ["Taller El Progreso SAS", 2_100_000],
  ["Distribuidora Sabana SAS", 3_200_000],
  ["Estudio Contable Ríos SAS", 1_450_000],
  ["Panadería La Espiga SAS", 1_200_000],
  ["Clínica Veterinaria Patitas SAS", 2_750_000],
  ["Ferretería El Roble SAS", 1_950_000],
] as const;

function rent([legalName, price]: (typeof tenants)[number], index: number): Row {
  return {
    Referencia: `ARR-2026-11-${String(index + 1).padStart(3, "0")}`,
    "Tipo de identificación": "NIT",
    "Número de identificación": uniqueNit(),
    "Tipo de persona": "Persona jurídica",
    "Nombre o razón social": legalName,
    "Régimen de IVA": "Responsable de IVA",
    "Forma de pago": "De contado",
    "Medio de pago": "Transferencia bancaria",
    Descripción: "Arriendo de local, noviembre",
    Cantidad: "1",
    "Precio unitario": String(price),
    IVA: "IVA 19 %",
  };
}

async function open(page: Page, path: string) {
  await openPage(page, path);
  await page.addStyleTag({ content: ".tsqd-parent-container { display: none !important; }" });
}

test("a finished batch from Excel", async ({ page, organization }) => {
  test.setTimeout(120_000);
  await markEmailVerified(organization.email);
  await onboardIssuer(organization, uniqueNit(), "Inmuebles del Centro SAS", { testSet: false });

  await open(page, "/documents/batches/new");
  await page.getByLabel("Archivo de facturas").setInputFiles({
    name: "arriendos-noviembre.csv",
    mimeType: "text/csv",
    buffer: csv(tenants.map(rent)),
  });
  await page.getByRole("button", { name: `Emitir ${tenants.length} facturas` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Emitir" }).click();

  await expect(page.getByRole("heading", { name: "arriendos-noviembre.csv" })).toBeVisible();
  await expect(page.getByText("Terminado")).toBeVisible({ timeout: 60_000 });
  await page.screenshot({
    path: `${directory}lote-terminado.png`,
    animations: "disabled",
  });
});
