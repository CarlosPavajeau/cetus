import Papa from "papaparse";

import { taxPresets } from "~/features/issuance/catalogs";
import { departments } from "~/features/setup/divipola";
import type { BatchError, BatchItem, BatchLine } from "~/lib/api/types";

import {
  columns,
  header,
  identificationTypeOptions,
  invoiceSheet,
  paymentMeansOptions,
  paymentMethodOptions,
  personTypeOptions,
  taxLevelOptions,
  taxOptions,
  taxSchemeOptions,
  templateVersion,
  unitOptions,
  type ColumnKey,
  type Option,
} from "./columns";

// Turns a spreadsheet into the items of a batch. It knows nothing of React nor of the worker that runs it.

export const referencesMax = 1000;
export const rowsMax = 5000;
export const linesMax = 500;
const referenceLengthMax = 40;

export type Cell = string | number | boolean | Date | null;

export type SheetData = { sheet: string; data: Cell[][] };

/** A value a spreadsheet reader hands over, as a cell; anything else counts as empty. */
export function toCell(value: unknown): Cell {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
    ? value
    : null;
}

/** A problem of a cell, a row or the whole invoice; rows count as the spreadsheet does, the header being 1. */
export type RowError = { row: number; column: string | null; message: string };

/** One invoice of the file: the rows it came from and, without errors, what the API receives. */
export type ParsedInvoice = {
  reference: string;
  /** The rows of its lines, in order: the first one also carries the invoice's columns. */
  rows: number[];
  item: BatchItem | null;
  errors: RowError[];
};

export type ParsedFile =
  | { ok: true; invoices: ParsedInvoice[]; rowCount: number }
  | { ok: false; message: string };

/** The template, or any .xlsx whose first sheet (or one named "Facturas") has its headers. */
export function parseWorkbook(sheets: SheetData[]): ParsedFile {
  const meta = sheets.find((sheet) => sheet.sheet === "_meta");
  const version = meta?.data[0]?.[0];
  if (meta !== undefined && version !== templateVersion) {
    return {
      ok: false,
      message:
        "El archivo es de una versión anterior de la plantilla. Descarga la plantilla nueva y copia allí tus facturas.",
    };
  }
  const sheet = sheets.find((candidate) => candidate.sheet === invoiceSheet) ?? sheets[0];
  if (sheet === undefined) {
    return { ok: false, message: "El archivo no tiene hojas." };
  }
  return parseTable(sheet.data);
}

/** A CSV with the template's headers, separated by commas or semicolons, in UTF-8 with or without BOM. */
export function parseCsv(content: string): ParsedFile {
  // Blank lines stay so rows keep the spreadsheet's numbers; parseTable skips them. The file size bounds the work.
  const result = Papa.parse<string[]>(content.replace(/^﻿/, ""), {
    delimitersToGuess: [",", ";"],
  });
  if (result.data.every((cells) => cells.every((cell) => cell.trim() === ""))) {
    return { ok: false, message: "El archivo está vacío." };
  }
  return parseTable(result.data);
}

export function parseTable(table: Cell[][]): ParsedFile {
  const [headerRow, ...body] = table;
  if (headerRow === undefined) {
    return { ok: false, message: "El archivo está vacío." };
  }
  const positions = new Map<string, number>();
  headerRow.forEach((cell, index) => positions.set(normalize(text(cell)), index));
  const missing = columns.filter((column) => !positions.has(normalize(column.header)));
  if (missing.length > 0) {
    return {
      ok: false,
      message: `Faltan columnas de la plantilla: ${missing.map((column) => column.header).join(", ")}.`,
    };
  }
  const rows = body
    .map((cells, index) => ({ number: index + 2, cells }))
    .filter((row) => row.cells.some((cell) => text(cell) !== ""));
  if (rows.length > rowsMax) {
    return {
      ok: false,
      message: `El archivo tiene más de ${rowsMax} filas. Divídelo en varios lotes.`,
    };
  }
  if (rows.length === 0) {
    return { ok: false, message: "El archivo no tiene facturas." };
  }

  const read = (cells: Cell[], key: ColumnKey): Cell =>
    cells[positions.get(normalize(header(key))) ?? -1] ?? null;
  const groups = new Map<string, { number: number; cells: Cell[] }[]>();
  const unreferenced: RowError[] = [];
  for (const row of rows) {
    const reference = text(read(row.cells, "reference"));
    if (reference === "") {
      unreferenced.push({
        row: row.number,
        column: header("reference"),
        message: "Falta la referencia de la factura.",
      });
      continue;
    }
    groups.set(reference, [...(groups.get(reference) ?? []), row]);
  }
  if (groups.size > referencesMax) {
    return {
      ok: false,
      message: `El archivo tiene más de ${referencesMax} facturas. Divídelo en varios lotes.`,
    };
  }

  const invoices = [...groups.entries()].map(([reference, group]) =>
    readInvoice(reference, group, (cells, key) => read(cells, key)),
  );
  if (unreferenced.length > 0) {
    invoices.unshift({ reference: "", rows: [], item: null, errors: unreferenced });
  }
  return { ok: true, invoices, rowCount: rows.length };
}

type Reader = (cells: Cell[], key: ColumnKey) => Cell;

function readInvoice(
  reference: string,
  group: { number: number; cells: Cell[] }[],
  read: Reader,
): ParsedInvoice {
  const errors: RowError[] = [];
  const first = group[0];
  if (first === undefined) {
    throw new Error(`The invoice ${reference} has no rows`);
  }
  const fail = (row: number, key: ColumnKey | null, message: string) =>
    errors.push({ row, column: key === null ? null : header(key), message });

  for (const row of group.slice(1)) {
    for (const column of columns) {
      if (!column.invoice || column.key === "reference") {
        continue;
      }
      const value = text(read(row.cells, column.key));
      if (value !== "" && value !== text(read(first.cells, column.key))) {
        fail(
          row.number,
          column.key,
          `No coincide con la primera fila de la factura (fila ${first.number}). Deja la celda vacía o repite el valor.`,
        );
      }
    }
  }
  if (reference.length > referenceLengthMax) {
    fail(first.number, "reference", `Escribe hasta ${referenceLengthMax} caracteres.`);
  }
  if (group.length > linesMax) {
    fail(first.number, null, `La factura tiene más de ${linesMax} líneas.`);
  }

  const field = <T>(
    key: ColumnKey,
    parse: (cell: Cell) => Parsed<T>,
    row = first,
  ): T | undefined => {
    const result = parse(read(row.cells, key));
    if (!result.ok) {
      fail(row.number, key, result.message);
      return undefined;
    }
    return result.value;
  };

  const identificationType = field("identificationType", required(list(identificationTypeOptions)));
  const identificationNumber = field("identificationNumber", required(plain(20)));
  const checkDigit = field("checkDigit", optional(pattern(/^\d$/, "Escribe un solo dígito.")));
  const personType = field("personType", optional(list(personTypeOptions)));
  const legalName = field("legalName", optional(plain(450)));
  const taxLevel = field("taxLevel", optional(list(taxLevelOptions)));
  const taxScheme = field("taxScheme", optional(list(taxSchemeOptions)));
  const municipality = field("municipality", optional(municipalityOf));
  const addressLine = field("addressLine", optional(plain(300)));
  const email = field(
    "email",
    optional(pattern(/^(?=.{1,254}$)[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Escribe un correo válido.")),
  );
  const phone = field(
    "phone",
    optional(pattern(/^[0-9+() -]{1,50}$/, "Usa solo números, espacios y + ( ) -.")),
  );
  const method = field("paymentMethod", required(list(paymentMethodOptions)));
  const meansCode = field("paymentMeans", required(list(paymentMeansOptions)));
  const dueDate = field("dueDate", optional(date));
  const notes = field("notes", optional(plain(500)));

  if (method === "CREDIT" && dueDate === null) {
    fail(first.number, "dueDate", "Una venta a crédito necesita fecha de vencimiento.");
  }
  if (
    (municipality === null) !== (addressLine === null) &&
    municipality !== undefined &&
    addressLine !== undefined
  ) {
    fail(
      first.number,
      municipality === null ? "municipality" : "addressLine",
      "Escribe el municipio y la dirección juntos, o deja los dos vacíos.",
    );
  }

  const lines = group.map((row): BatchLine | undefined => {
    const productCode = field("productCode", optional(plain(50)), row);
    const description = field("description", optional(plain(300)), row);
    const quantity = field("quantity", required(decimal), row);
    const unitCode = field("unitCode", optional(unitOf), row);
    const unitPrice = field("unitPrice", optional(decimal), row);
    const tax = field("tax", optional(list(taxOptions)), row);
    if (productCode === null && description === null) {
      fail(row.number, "description", "Sin código de producto, escribe la descripción.");
    }
    if (productCode === null && unitPrice === null) {
      fail(row.number, "unitPrice", "Sin código de producto, escribe el precio.");
    }
    if (quantity !== undefined && quantity !== null && quantity <= 0) {
      fail(row.number, "quantity", "Escribe una cantidad mayor que cero.");
    }
    if (
      productCode === undefined ||
      description === undefined ||
      quantity === undefined ||
      quantity === null ||
      unitCode === undefined ||
      unitPrice === undefined ||
      tax === undefined
    ) {
      return undefined;
    }
    return {
      ...(productCode === null ? {} : { productCode }),
      ...(description === null ? {} : { description }),
      quantity,
      ...(unitCode === null ? {} : { unitCode }),
      ...(unitPrice === null ? {} : { unitPrice }),
      ...(tax === null ? {} : { taxes: taxPresets[tax].taxes }),
    };
  });

  const rows = group.map((row) => row.number);
  if (
    errors.length > 0 ||
    identificationType === undefined ||
    identificationType === null ||
    identificationNumber === undefined ||
    identificationNumber === null ||
    method === undefined ||
    method === null ||
    meansCode === undefined ||
    meansCode === null
  ) {
    return { reference, rows, item: null, errors };
  }
  const validLines = lines.filter((line): line is BatchLine => line !== undefined);
  return {
    reference,
    rows,
    errors,
    item: {
      reference,
      customer: {
        identificationType,
        identificationNumber,
        ...(checkDigit ? { checkDigit } : {}),
        ...(personType ? { personType } : {}),
        ...(legalName ? { legalName } : {}),
        ...(taxLevel ? { taxLevelCodes: [taxLevel] } : {}),
        ...(taxScheme ? { taxScheme } : {}),
        ...(municipality && addressLine
          ? { address: { ...municipality, line: addressLine, countryCode: "CO" } }
          : {}),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
      },
      payment: { method, meansCode, ...(dueDate ? { dueDate } : {}) },
      lines: validLines,
      ...(notes ? { notes: [notes] } : {}),
    },
  };
}

/**
 * Where an error the API found in the {@code index}-th invoice sent lies in the file: the row of the line or of the
 * invoice, and the column of the field.
 */
export function locate(error: BatchError, sent: ParsedInvoice[]): RowError {
  const invoice = sent[error.index];
  const firstRow = invoice?.rows[0] ?? 0;
  const field = error.field ?? "";
  const line = /^lines\[(\d+)\]\.?(.*)$/.exec(field);
  if (line) {
    const row = invoice?.rows[Number(line[1])] ?? firstRow;
    return {
      row,
      column: lineColumns[line[2]?.split(".")[0] ?? ""] ?? null,
      message: error.message,
    };
  }
  return {
    row: firstRow,
    column: invoiceColumns[field] ?? invoiceColumns[field.split(".").slice(0, 2).join(".")] ?? null,
    message: error.message,
  };
}

const lineColumns: Record<string, string> = {
  productCode: header("productCode"),
  itemCode: header("productCode"),
  description: header("description"),
  quantity: header("quantity"),
  unitCode: header("unitCode"),
  unitPrice: header("unitPrice"),
  taxes: header("tax"),
};

const invoiceColumns: Record<string, string> = {
  reference: header("reference"),
  externalReference: header("reference"),
  "customer.identificationType": header("identificationType"),
  "customer.identificationNumber": header("identificationNumber"),
  "customer.checkDigit": header("checkDigit"),
  "customer.personType": header("personType"),
  "customer.legalName": header("legalName"),
  "customer.taxLevelCodes": header("taxLevel"),
  "customer.taxScheme": header("taxScheme"),
  "customer.address": header("municipality"),
  "customer.address.line": header("addressLine"),
  "customer.email": header("email"),
  "customer.phone": header("phone"),
  "payment.method": header("paymentMethod"),
  "payment.meansCode": header("paymentMeans"),
  "payment.dueDate": header("dueDate"),
  notes: header("notes"),
};

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });
const failure = (message: string): Parsed<never> => ({ ok: false, message });

function required<T>(parse: (cell: Cell) => Parsed<T>) {
  return (cell: Cell): Parsed<T | null> =>
    text(cell) === "" ? failure("Este dato es obligatorio.") : parse(cell);
}

function optional<T>(parse: (cell: Cell) => Parsed<T>) {
  return (cell: Cell): Parsed<T | null> => (text(cell) === "" ? ok(null) : parse(cell));
}

function plain(max: number) {
  return (cell: Cell): Parsed<string> => {
    const value = text(cell);
    return value.length > max ? failure(`Escribe hasta ${max} caracteres.`) : ok(value);
  };
}

function pattern(regex: RegExp, message: string) {
  return (cell: Cell): Parsed<string> =>
    regex.test(text(cell)) ? ok(text(cell)) : failure(message);
}

/** A label of the list or its code, whatever the case and the accents. */
function list<Code extends string>(options: readonly Option<Code>[]) {
  const byKey = new Map<string, Code>();
  for (const option of options) {
    byKey.set(normalize(option.label), option.code);
    byKey.set(normalize(option.code), option.code);
  }
  return (cell: Cell): Parsed<Code> => {
    const code = byKey.get(normalize(text(cell)));
    return code === undefined ? failure("Elige un valor de la lista.") : ok(code);
  };
}

/** A listed unit, or any DIAN code typed as such. */
function unitOf(cell: Cell): Parsed<string> {
  const listed = list(unitOptions)(cell);
  if (listed.ok) {
    return listed;
  }
  const value = text(cell).toUpperCase();
  return /^[0-9A-Z]{1,3}$/.test(value)
    ? ok(value)
    : failure("Elige una unidad de la lista o escribe su código DIAN.");
}

type MunicipalityAddress = {
  municipalityCode: string;
  cityName: string;
  departmentCode: string;
  departmentName: string;
};

const municipalities = new Map<string, MunicipalityAddress>();
for (const department of departments) {
  for (const municipality of department.municipalities) {
    const address = {
      municipalityCode: municipality.code,
      cityName: municipality.name,
      departmentCode: department.code,
      departmentName: department.name,
    };
    municipalities.set(normalize(municipalityLabel(municipality.name, department.name)), address);
    municipalities.set(municipality.code, address);
  }
}

/** How the template lists a municipality: its name and its department's. */
export function municipalityLabel(municipality: string, department: string) {
  return `${municipality} - ${department}`;
}

function municipalityOf(cell: Cell): Parsed<MunicipalityAddress> {
  const value = typeof cell === "number" ? String(cell).padStart(5, "0") : text(cell);
  const found = municipalities.get(normalize(value)) ?? municipalities.get(value);
  return found === undefined
    ? failure(
        "Elige el municipio de la lista, como «Montería - Córdoba», o escribe su código DANE.",
      )
    : ok(found);
}

/** A number of zero or more, with a comma or a dot for decimals and no thousands separators, up to six decimals. */
function decimal(cell: Cell): Parsed<number> {
  if (typeof cell === "number") {
    if (!Number.isFinite(cell)) {
      return failure("Escribe un número.");
    }
    return cell < 0
      ? failure("Escribe un número mayor o igual a cero.")
      : ok(Number(cell.toFixed(6)));
  }
  const value = text(cell);
  if (!/^\d{1,14}([.,]\d{1,6})?$/.test(value)) {
    return failure(
      "Escribe el número sin separadores de miles, con coma o punto para los decimales.",
    );
  }
  return ok(Number(value.replace(",", ".")));
}

/** A date cell, or text as AAAA-MM-DD or DD/MM/AAAA. */
function date(cell: Cell): Parsed<string> {
  if (cell instanceof Date) {
    return Number.isNaN(cell.getTime())
      ? failure("Escribe una fecha válida.")
      : ok(cell.toISOString().slice(0, 10));
  }
  const value = text(cell);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  const parts = iso ? [iso[1], iso[2], iso[3]] : local ? [local[3], local[2], local[1]] : null;
  if (parts === null) {
    return failure("Escribe la fecha como AAAA-MM-DD o DD/MM/AAAA.");
  }
  const [year, month, day] = parts.map(Number);
  const parsed = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return failure("Escribe una fecha que exista.");
  }
  return ok(parsed.toISOString().slice(0, 10));
}

function text(cell: Cell | undefined): string {
  if (cell === null || cell === undefined) {
    return "";
  }
  if (cell instanceof Date) {
    return Number.isNaN(cell.getTime()) ? "" : cell.toISOString().slice(0, 10);
  }
  return String(cell).trim();
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
