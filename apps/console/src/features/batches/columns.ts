import {
  identificationTypes,
  paymentMeans,
  paymentMethods,
  personTypes,
  taxPresetIds,
  taxPresets,
} from "~/features/issuance/catalogs";
import { taxLevelItems } from "~/features/setup/taxLevels";

/** The version the template carries in its hidden `_meta` sheet; a file with another one is refused. */
export const templateVersion = "facturas-v1";

export const templatePath = "/plantillas/facturas-v1.xlsx";

export const invoiceSheet = "Facturas";

/**
 * The template's columns, in order. A CSV must have the same ones, by header. `invoice` columns describe the
 * whole invoice and go in the first row of its reference; the others describe one of its lines.
 */
export const columns = [
  { key: "reference", header: "Referencia", invoice: true },
  { key: "identificationType", header: "Tipo de identificación", invoice: true },
  { key: "identificationNumber", header: "Número de identificación", invoice: true },
  { key: "checkDigit", header: "DV", invoice: true },
  { key: "personType", header: "Tipo de persona", invoice: true },
  { key: "legalName", header: "Nombre o razón social", invoice: true },
  { key: "taxLevel", header: "Responsabilidad fiscal", invoice: true },
  { key: "taxScheme", header: "Régimen de IVA", invoice: true },
  { key: "municipality", header: "Municipio", invoice: true },
  { key: "addressLine", header: "Dirección", invoice: true },
  { key: "email", header: "Email", invoice: true },
  { key: "phone", header: "Teléfono", invoice: true },
  { key: "paymentMethod", header: "Forma de pago", invoice: true },
  { key: "paymentMeans", header: "Medio de pago", invoice: true },
  { key: "dueDate", header: "Fecha de vencimiento", invoice: true },
  { key: "productCode", header: "Código de producto", invoice: false },
  { key: "description", header: "Descripción", invoice: false },
  { key: "quantity", header: "Cantidad", invoice: false },
  { key: "unitCode", header: "Unidad", invoice: false },
  { key: "unitPrice", header: "Precio unitario", invoice: false },
  { key: "tax", header: "IVA", invoice: false },
  { key: "consumptionTax", header: "Impuesto al consumo", invoice: false },
  { key: "notes", header: "Notas", invoice: true },
] as const;

export type ColumnKey = (typeof columns)[number]["key"];

export function header(key: ColumnKey): string {
  const column = columns.find((candidate) => candidate.key === key);
  if (column === undefined) {
    throw new Error(`Unknown column ${key}`);
  }
  return column.header;
}

/** An option of a list column: the label the template shows, the code the API takes. */
export type Option<Code extends string> = { label: string; code: Code };

export const identificationTypeOptions = identificationTypes.map((option) => ({
  label: option.label,
  code: option.value,
}));

export const personTypeOptions = personTypes.map((option) => ({
  label: option.label,
  code: option.value,
}));

/** Labeled with the code, as the RUT prints them, so either one is found. */
export const taxLevelOptions = taxLevelItems.map((item) => ({
  label: `${item.label} (${item.value})`,
  code: item.value,
}));

export const taxSchemeOptions = [
  { label: "Responsable de IVA", code: "IVA" },
  { label: "No responsable de IVA", code: "NOT_APPLICABLE" },
] as const;

export const paymentMethodOptions = paymentMethods.map((option) => ({
  label: option.label,
  code: option.value,
}));

export const paymentMeansOptions = paymentMeans.map((means) => ({
  label: means.label,
  code: means.code,
}));

export const taxOptions = taxPresetIds
  .filter((code) => taxPresets[code].taxes.every((tax) => tax.type === "IVA"))
  .map((code) => ({ label: taxPresets[code].label, code }));

export const consumptionTaxOptions = taxPresetIds
  .filter((code) => taxPresets[code].taxes.some((tax) => tax.type === "INC"))
  .map((code) => ({ label: taxPresets[code].label, code }));

/** The usual units of measure (annex table 13.3.6); any other DIAN code is accepted as typed. */
export const unitOptions = [
  { label: "Unidad (94)", code: "94" },
  { label: "Kilogramo (KGM)", code: "KGM" },
  { label: "Litro (LTR)", code: "LTR" },
  { label: "Metro (MTR)", code: "MTR" },
  { label: "Hora (HUR)", code: "HUR" },
  { label: "Día (DAY)", code: "DAY" },
  { label: "Mes (MON)", code: "MON" },
] as const;
