import { readFile } from "node:fs/promises";

import readXlsxFile from "read-excel-file/node";
import { describe, expect, it } from "vite-plus/test";

import { columns, templateVersion } from "~/features/batches/columns";
import {
  locate,
  parseCsv,
  parseTable,
  parseWorkbook,
  referencesMax,
  rowsMax,
  toCell,
  type Cell,
  type ParsedFile,
  type ParsedInvoice,
} from "~/features/batches/parse";

const headers = columns.map((column) => column.header);

/** A row of the template, by header; the columns left out are empty. */
function row(values: Partial<Record<string, Cell>>): Cell[] {
  return headers.map((header) => values[header] ?? null);
}

const customer = {
  "Tipo de identificación": "NIT",
  "Número de identificación": "900123456",
  "Tipo de persona": "Persona jurídica",
  "Nombre o razón social": "Inmobiliaria Andina SAS",
  "Forma de pago": "De contado",
  "Medio de pago": "Efectivo",
};

const line = { Descripción: "Arriendo", Cantidad: 1, "Precio unitario": 2500000, IVA: "IVA 19 %" };

function invoices(parsed: ParsedFile): ParsedInvoice[] {
  if (!parsed.ok) {
    throw new Error(parsed.message);
  }
  return parsed.invoices;
}

describe("the template", () => {
  it("has every column and a list value of each list that the parser reads", async () => {
    const sheets = (await readXlsxFile(await readFile("public/plantillas/facturas-v1.xlsx"))).map(
      ({ sheet, data }) => ({ sheet, data: data.map((cells) => cells.map(toCell)) }),
    );
    const facturas = sheets.find((sheet) => sheet.sheet === "Facturas");
    expect(facturas?.data[0]).toEqual(headers);
    expect(sheets.find((sheet) => sheet.sheet === "_meta")?.data[0]?.[0]).toBe(templateVersion);

    const lists = sheets.find((sheet) => sheet.sheet === "Listas")?.data ?? [];
    const keys = lists[0] ?? [];
    const values = (key: string) =>
      lists
        .slice(1)
        .map((cells) => cells[keys.indexOf(key)])
        .filter((cell): cell is string => typeof cell === "string");
    const rows: Cell[][] = values("identificationType").map((type, index) =>
      row({
        ...customer,
        ...line,
        Referencia: `R-${index}`,
        "Tipo de identificación": type,
        "Número de identificación": type === "NIT" ? "900123456" : "1234567",
        "Responsabilidad fiscal": values("taxLevel")[index % values("taxLevel").length] ?? null,
        "Régimen de IVA": values("taxScheme")[index % 2] ?? null,
        "Tipo de persona": values("personType")[index % 2] ?? null,
        "Forma de pago": "De contado",
        "Medio de pago": values("paymentMeans")[index] ?? null,
        Unidad: values("unitCode")[index] ?? null,
        IVA: values("tax")[index % values("tax").length] ?? null,
        Municipio: values("municipality")[index * 100] ?? null,
        Dirección: "Calle 1 # 2-3",
      }),
    );
    const parsed = invoices(parseTable([headers, ...rows]));
    expect(parsed.flatMap((invoice) => invoice.errors)).toEqual([]);
    expect(parsed).toHaveLength(values("identificationType").length);
  });

  it("is refused in an older version", () => {
    const parsed = parseWorkbook([
      { sheet: "Facturas", data: [headers] },
      { sheet: "_meta", data: [["facturas-v0"]] },
    ]);
    expect(parsed).toMatchObject({ ok: false });
  });
});

describe("parseTable", () => {
  it("groups the rows of a reference into one invoice, even apart, in the order they first appear", () => {
    const parsed = invoices(
      parseTable([
        headers,
        row({ ...customer, ...line, Referencia: "A" }),
        row({ ...customer, ...line, Referencia: "B" }),
        row({ ...line, Referencia: "A", Descripción: "Administración", IVA: "Excluido de IVA" }),
      ]),
    );

    expect(parsed.map((invoice) => invoice.reference)).toEqual(["A", "B"]);
    expect(parsed[0]?.rows).toEqual([2, 4]);
    expect(parsed[0]?.item).toEqual({
      reference: "A",
      customer: {
        identificationType: "NIT",
        identificationNumber: "900123456",
        personType: "LEGAL_ENTITY",
        legalName: "Inmobiliaria Andina SAS",
      },
      payment: { method: "CASH", meansCode: "10" },
      lines: [
        {
          description: "Arriendo",
          quantity: 1,
          unitPrice: 2500000,
          taxes: [{ type: "IVA", percent: 19 }],
        },
        { description: "Administración", quantity: 1, unitPrice: 2500000, taxes: [] },
      ],
    });
  });

  it("refuses a later row whose invoice columns differ from the first one", () => {
    const parsed = invoices(
      parseTable([
        headers,
        row({ ...customer, ...line, Referencia: "A" }),
        row({ ...line, Referencia: "A", "Nombre o razón social": "Otra SAS" }),
      ]),
    );

    expect(parsed[0]?.item).toBeNull();
    expect(parsed[0]?.errors).toEqual([
      expect.objectContaining({ row: 3, column: "Nombre o razón social" }),
    ]);
  });

  it("leaves to the catalogs what an item only names", () => {
    const parsed = invoices(
      parseTable([
        headers,
        row({
          Referencia: "A",
          "Tipo de identificación": "nit",
          "Número de identificación": 900888777,
          "Forma de pago": "CASH",
          "Medio de pago": "10",
          "Código de producto": "ARR-1",
          Cantidad: "2,5",
        }),
      ]),
    );

    expect(parsed[0]?.item).toEqual({
      reference: "A",
      customer: { identificationType: "NIT", identificationNumber: "900888777" },
      payment: { method: "CASH", meansCode: "10" },
      lines: [{ productCode: "ARR-1", quantity: 2.5 }],
    });
  });

  it("reads a municipality by its label or its DANE code, and dates as typed", () => {
    const credit = { ...customer, "Forma de pago": "A crédito", Dirección: "Calle 27 # 3-45" };
    const parsed = invoices(
      parseTable([
        headers,
        row({
          ...credit,
          ...line,
          Referencia: "A",
          Municipio: "Montería - Córdoba",
          "Fecha de vencimiento": "15/12/2026",
        }),
        row({
          ...credit,
          ...line,
          Referencia: "B",
          Municipio: 23001,
          "Fecha de vencimiento": new Date(Date.UTC(2026, 11, 15)),
        }),
        row({
          ...credit,
          ...line,
          Referencia: "C",
          Municipio: "Montería",
          "Fecha de vencimiento": "31/02/2026",
        }),
        row({ ...credit, ...line, Referencia: "D", Municipio: "23001" }),
      ]),
    );

    expect(parsed[0]?.item?.customer.address).toEqual({
      municipalityCode: "23001",
      cityName: "Montería",
      departmentCode: "23",
      departmentName: "Córdoba",
      line: "Calle 27 # 3-45",
      countryCode: "CO",
    });
    expect(parsed[0]?.item?.payment.dueDate).toBe("2026-12-15");
    expect(parsed[1]?.item?.payment.dueDate).toBe("2026-12-15");
    expect(parsed[2]?.errors.map((error) => error.column)).toEqual([
      "Municipio",
      "Fecha de vencimiento",
    ]);
    expect(parsed[3]?.errors.map((error) => error.column)).toEqual(["Fecha de vencimiento"]);
  });

  it("names the cell of each error", () => {
    const parsed = invoices(
      parseTable([
        headers,
        row({
          ...customer,
          Referencia: "A",
          "Tipo de identificación": "Cédula",
          Cantidad: "1.000,5",
          IVA: "IVA 21 %",
        }),
        row({ ...customer, ...line, "Medio de pago": null }),
      ]),
    );

    expect(parsed[0]?.reference).toBe("");
    expect(parsed[0]?.errors).toEqual([expect.objectContaining({ row: 3, column: "Referencia" })]);
    expect(parsed[1]?.errors.map((error) => error.column)).toEqual([
      "Tipo de identificación",
      "Cantidad",
      "IVA",
      "Descripción",
      "Precio unitario",
    ]);
  });

  it("refuses what the API would, before the invoice counts as ready", () => {
    const parsed = invoices(
      parseTable([
        headers,
        row({ ...customer, ...line, Referencia: "R".repeat(41) }),
        row({ ...customer, ...line, Referencia: "B", "Precio unitario": -100 }),
        row({ ...customer, ...line, Referencia: "C", Email: `${"a".repeat(250)}@x.co` }),
        row({ ...customer, ...line, Referencia: "D", Email: "josé.peña@empresa.co" }),
        row({ ...customer, ...line, Referencia: "E", Cantidad: 1e15 }),
        row({ ...customer, ...line, Referencia: "F\n2" }),
        row({ ...customer, ...line, Referencia: "G", "Código de producto": "P\t1" }),
      ]),
    );

    expect(
      parsed.map((invoice) => [invoice.item, invoice.errors.map((error) => error.column)]),
    ).toEqual([
      [null, ["Referencia"]],
      [null, ["Precio unitario"]],
      [null, ["Email"]],
      [null, ["Email"]],
      [null, ["Cantidad"]],
      [null, ["Referencia"]],
      [null, ["Código de producto"]],
    ]);
  });

  it("shows text as it came, without interpreting it", () => {
    const parsed = invoices(
      parseTable([
        headers,
        row({
          ...customer,
          ...line,
          Referencia: "A",
          "Nombre o razón social": "<img src=x onerror=alert(1)>",
        }),
      ]),
    );
    expect(parsed[0]?.item?.customer.legalName).toBe("<img src=x onerror=alert(1)>");
  });

  it("refuses a file without the template's columns or over its limits", () => {
    expect(parseTable([["Referencia", "Cliente"]])).toMatchObject({ ok: false });
    const tooManyRows = Array.from({ length: rowsMax + 1 }, () =>
      row({ ...customer, ...line, Referencia: "A" }),
    );
    expect(parseTable([headers, ...tooManyRows])).toMatchObject({ ok: false });
    const tooManyInvoices = Array.from({ length: referencesMax + 1 }, (_, index) =>
      row({ ...customer, ...line, Referencia: `R-${index}` }),
    );
    expect(parseTable([headers, ...tooManyInvoices])).toMatchObject({ ok: false });
  });
});

function csv(separator: string) {
  return [
    headers.join(separator),
    row({ ...customer, ...line, Referencia: "A", Cantidad: "1,5", "Precio unitario": "1000.25" })
      .map((cell) => (cell === null ? "" : String(cell)))
      .map((cell) => (cell.includes(separator) ? `"${cell}"` : cell))
      .join(separator),
  ].join("\r\n");
}

describe("parseCsv", () => {
  it("detects commas and semicolons, with or without BOM", () => {
    for (const text of [csv(","), `\uFEFF${csv(";")}`]) {
      const parsed = invoices(parseCsv(text));
      expect(parsed[0]?.item?.lines).toEqual([
        {
          description: "Arriendo",
          quantity: 1.5,
          unitPrice: 1000.25,
          taxes: [{ type: "IVA", percent: 19 }],
        },
      ]);
    }
  });

  it("numbers rows as the file does, blank lines included", () => {
    for (const separator of [",", ";"]) {
      const [header, invoice] = csv(separator).split("\r\n");
      const lines = [header, "", "", "", invoice?.replace("Arriendo", ""), ""];
      const parsed = invoices(parseCsv(lines.join("\r\n")));
      expect(parsed[0]?.rows).toEqual([5]);
      expect(parsed[0]?.errors).toEqual([
        expect.objectContaining({ row: 5, column: "Descripción" }),
      ]);
    }
  });
});

describe("locate", () => {
  it("places an error the API found in the row of its line and the column of its field", () => {
    const sent = invoices(
      parseTable([
        headers,
        row({ ...customer, ...line, Referencia: "A" }),
        row({ ...line, Referencia: "A" }),
      ]),
    );

    expect(
      locate(
        {
          index: 0,
          reference: "A",
          field: "lines[1].unitPrice",
          code: "invalid_field",
          message: "m",
        },
        sent,
      ),
    ).toEqual({ row: 3, column: "Precio unitario", message: "m" });
    expect(
      locate(
        {
          index: 0,
          reference: "A",
          field: "customer.address.line",
          code: "invalid_field",
          message: "m",
        },
        sent,
      ),
    ).toEqual({ row: 2, column: "Dirección", message: "m" });
    expect(
      locate(
        {
          index: 0,
          reference: "A",
          field: null,
          code: "customer_check_digit_invalid",
          message: "m",
        },
        sent,
      ),
    ).toEqual({ row: 2, column: null, message: "m" });
  });
});
