import type { IdentificationType, LineTax, PersonType } from "~/lib/api/types";

export type TaxPreset = "IVA_19" | "IVA_5" | "EXEMPT" | "EXCLUDED" | "INC_8";

/**
 * The taxes a line can carry without knowing their codes (annex table 13.3.11). An exempt item reports IVA
 * at 0 %; an excluded one reports no tax at all.
 */
export const taxPresets: Record<TaxPreset, { label: string; taxes: LineTax[] }> = {
  IVA_19: { label: "IVA 19 %", taxes: [{ type: "IVA", percent: 19 }] },
  IVA_5: { label: "IVA 5 %", taxes: [{ type: "IVA", percent: 5 }] },
  EXEMPT: { label: "Exento de IVA (0 %)", taxes: [{ type: "IVA", percent: 0 }] },
  EXCLUDED: { label: "Excluido de IVA", taxes: [] },
  INC_8: { label: "Impuesto al consumo 8 %", taxes: [{ type: "INC", percent: 8 }] },
};

export const taxPresetIds = [
  "IVA_19",
  "IVA_5",
  "EXEMPT",
  "EXCLUDED",
  "INC_8",
] as const satisfies readonly TaxPreset[];

/** The usual payment means (annex table 13.3.4.2); "ZZZ" covers the rest. */
export const paymentMeans = [
  { code: "10", label: "Efectivo" },
  { code: "47", label: "Transferencia bancaria" },
  { code: "42", label: "Consignación bancaria" },
  { code: "48", label: "Tarjeta de crédito" },
  { code: "49", label: "Tarjeta de débito" },
  { code: "20", label: "Cheque" },
  { code: "ZZZ", label: "Otro" },
] as const;

export type PaymentMeansCode = (typeof paymentMeans)[number]["code"];

export const paymentMeansCodes = paymentMeans.map((means) => means.code);

/** The identification documents a customer usually has (annex table 13.2.1). */
export const identificationTypes = [
  { value: "NIT", label: "NIT" },
  { value: "CITIZEN_ID", label: "Cédula de ciudadanía" },
  { value: "FOREIGNER_ID", label: "Cédula de extranjería" },
  { value: "PASSPORT", label: "Pasaporte" },
  { value: "PEP", label: "Permiso especial de permanencia" },
  { value: "FOREIGN_DOCUMENT", label: "Documento de identificación extranjero" },
] as const satisfies readonly { value: IdentificationType; label: string }[];

export type CustomerIdentificationType = (typeof identificationTypes)[number]["value"];

export const personTypes = [
  { value: "LEGAL_ENTITY", label: "Persona jurídica" },
  { value: "NATURAL_PERSON", label: "Persona natural" },
] as const satisfies readonly { value: PersonType; label: string }[];

/**
 * A sale to someone who does not ask for an invoice in their name: the DIAN's generic "consumidor final",
 * a citizen ID made of twelve 2s.
 */
export const finalConsumer = {
  personType: "NATURAL_PERSON",
  identificationType: "CITIZEN_ID",
  identificationNumber: "222222222222",
  legalName: "Consumidor final",
} as const;
