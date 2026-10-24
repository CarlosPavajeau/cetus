import { type } from "arktype";

import { taxLevelCodes } from "~/features/setup/taxLevels";
import type { InvoiceLine, InvoiceRequest } from "~/lib/api/types";

import { identificationTypes, paymentMeansCodes, taxPresetIds, taxPresets } from "./catalogs";
import { nitCheckDigit } from "./nitCheckDigit";

// Shared by the issuance forms and the server functions that receive them.

/** Trims the text, then checks it, so the message names what is wrong with what remains. */
export const trimmed = (
  constraint:
    | "string > 0"
    | "0 < string <= 50"
    | "0 < string <= 300"
    | "0 < string <= 450"
    | "0 < string <= 500"
    | "string <= 300"
    | "string.email | ''",
  message: string,
) => type("string.trim").to(type(constraint).configure({ message }));

const required = (message: string) => trimmed("string > 0", message);

const decimal = /^\d{1,14}(\.\d{1,6})?$/;

export const lineSchema = type({
  "+": "delete",
  description: trimmed(
    "0 < string <= 300",
    "Describe el producto o servicio (hasta 300 caracteres).",
  ),
  quantity: type(decimal)
    .narrow((value) => Number(value) > 0)
    .configure({ message: "Escribe una cantidad mayor que cero." }),
  unitPrice: type(decimal).configure({ message: "Escribe el precio sin puntos de miles." }),
  tax: type.enumerated(...taxPresetIds),
  // Not shown: "94" (unit) unless the line comes from a saved product with its own.
  unitCode: /^[0-9A-Z]{1,3}$/,
});

export type LineValues = typeof lineSchema.infer;

export const linesSchema = lineSchema
  .array()
  .atLeastLength(1)
  .atMostLength(500)
  .configure({ message: "Agrega al menos una línea." });

/** The lines live in a form of their own, shared by the invoice and the notes. */
export const linesFormSchema = type({ "+": "delete", lines: linesSchema });

export type LinesFormValues = typeof linesFormSchema.infer;

/** A NIT with or without its verification digit: "900123456" or "900123456-7". */
const nitPattern = /^(\d{1,15})(?:-(\d))?$/;

export function splitNit(value: string) {
  const match = nitPattern.exec(value.trim());
  return match ? { nit: match[1] ?? "", checkDigit: match[2] ?? null } : null;
}

/** The customer lives in a form of its own, shared by the invoice and the catalog. */
export const customerFormSchema = type({
  "+": "delete",
  personType: "'LEGAL_ENTITY' | 'NATURAL_PERSON'",
  identificationType: type.enumerated(...identificationTypes.map((option) => option.value)),
  identificationNumber: required("Escribe el número de identificación."),
  legalName: trimmed("0 < string <= 450", "Escribe el nombre o la razón social."),
  email: trimmed("string.email | ''", "Escribe un correo válido o déjalo vacío."),
  responsibleForIva: "boolean",
  taxLevelCodes: type
    .enumerated(...taxLevelCodes)
    .array()
    .atLeastLength(1)
    .configure({ message: "Elige al menos una responsabilidad, como aparece en su RUT." }),
  departmentCode: "string",
  departmentName: "string",
  municipalityCode: "string",
  cityName: "string",
  line: trimmed("string <= 300", "La dirección tiene hasta 300 caracteres."),
}).narrow((customer, ctx) => {
  if (customer.identificationType === "NIT") {
    const parts = splitNit(customer.identificationNumber);
    if (!parts) {
      return ctx.reject({
        path: ["identificationNumber"],
        message:
          "Escribe el NIT con solo números; el dígito de verificación va opcional tras un guion.",
      });
    }
    const expected = nitCheckDigit(parts.nit);
    if (parts.checkDigit !== null && parts.checkDigit !== expected) {
      return ctx.reject({
        path: ["identificationNumber"],
        message: `El dígito de verificación de ese NIT es ${expected}.`,
      });
    }
  } else if (
    !identificationPattern(customer.identificationType).test(customer.identificationNumber)
  ) {
    return ctx.reject({
      path: ["identificationNumber"],
      message:
        customer.identificationType === "PASSPORT" ||
        customer.identificationType === "PEP" ||
        customer.identificationType === "FOREIGN_DOCUMENT"
          ? "Usa solo letras, números y guiones, hasta 20 caracteres."
          : "Escribe solo números, hasta 20.",
    });
  }
  if (customer.municipalityCode && !customer.line) {
    return ctx.reject({
      path: ["line"],
      message: "Escribe la dirección, o quita el municipio para no indicar ubicación.",
    });
  }
  if (customer.line && !customer.municipalityCode) {
    return ctx.reject({
      path: ["municipalityCode"],
      message: "Busca el municipio de la dirección, o bórrala para no indicar ubicación.",
    });
  }
  return true;
});

export type CustomerValues = typeof customerFormSchema.infer;

export const emptyCustomer: CustomerValues = {
  personType: "LEGAL_ENTITY",
  identificationType: "NIT",
  identificationNumber: "",
  legalName: "",
  email: "",
  responsibleForIva: false,
  taxLevelCodes: ["R-99-PN"],
  departmentCode: "",
  departmentName: "",
  municipalityCode: "",
  cityName: "",
  line: "",
};

/** Everything an invoice needs but its customer and its lines. */
export const invoiceHeaderSchema = type({
  "+": "delete",
  issuerId: type("string.uuid").configure({ message: "Elige el emisor." }),
  payment: {
    method: "'CASH' | 'CREDIT'",
    meansCode: type.enumerated(...paymentMeansCodes),
    dueDate: "string",
  },
}).narrow(({ payment }, ctx) => {
  if (payment.method === "CREDIT" && !/^\d{4}-\d{2}-\d{2}$/.test(payment.dueDate)) {
    return ctx.reject({
      path: ["payment", "dueDate"],
      message: "Una venta a crédito necesita fecha de vencimiento.",
    });
  }
  return true;
});

export type InvoiceHeaderValues = typeof invoiceHeaderSchema.infer;

/**
 * What a saved customer carries beyond the form's fields. It travels with the invoice only while the
 * customer is still the one picked, so a hand-typed customer never inherits it.
 */
export const customerExtrasSchema = type({
  "+": "delete",
  "tradeName?": "string <= 450",
  "phone?": /^[0-9+() -]{0,50}$/,
  "postalCode?": /^[0-9A-Za-z-]{1,10}$/,
});

export type CustomerExtras = typeof customerExtrasSchema.infer;

/** The saved customer picked into the form, with what travels beside it. */
export type PickedCustomer = {
  identificationType: CustomerValues["identificationType"];
  identificationNumber: string;
  extras: CustomerExtras;
};

/**
 * The picked customer's extras, only while the form still holds that customer: same document type and
 * number. A customer typed by hand, or a picked one changed into another, inherits nothing.
 */
export function pickedExtras(
  picked: PickedCustomer | null,
  customer: CustomerValues,
): CustomerExtras | null {
  return picked !== null &&
    picked.identificationType === customer.identificationType &&
    picked.identificationNumber === customer.identificationNumber
    ? picked.extras
    : null;
}

function identificationPattern(identificationType: CustomerValues["identificationType"]) {
  return identificationType === "CITIZEN_ID" || identificationType === "FOREIGNER_ID"
    ? /^\d{1,20}$/
    : /^[A-Za-z0-9-]{1,20}$/;
}

/** The line as the API takes it; the form has no item codes, so each line is numbered. */
export function toLine(line: LineValues, index: number): InvoiceLine {
  return {
    itemCode: String(index + 1),
    description: line.description,
    quantity: Number(line.quantity),
    unitCode: line.unitCode,
    unitPrice: Number(line.unitPrice),
    taxes: taxPresets[line.tax].taxes,
  };
}

/** The customer as the API takes it, with what the form does not show but a saved customer carries. */
export function toCustomerRequest(
  customer: CustomerValues,
  extras: CustomerExtras | null,
): InvoiceRequest["customer"] {
  const nit =
    customer.identificationType === "NIT" ? splitNit(customer.identificationNumber) : null;
  return {
    personType: customer.personType,
    identificationType: customer.identificationType,
    identificationNumber: nit ? nit.nit : customer.identificationNumber,
    ...(nit?.checkDigit ? { checkDigit: nit.checkDigit } : {}),
    legalName: customer.legalName,
    ...(extras?.tradeName ? { tradeName: extras.tradeName } : {}),
    taxLevelCodes: customer.taxLevelCodes,
    taxScheme: customer.responsibleForIva ? "IVA" : "NOT_APPLICABLE",
    ...(customer.email ? { email: customer.email } : {}),
    ...(extras?.phone ? { phone: extras.phone } : {}),
    ...(customer.municipalityCode
      ? {
          address: {
            municipalityCode: customer.municipalityCode,
            cityName: customer.cityName,
            departmentCode: customer.departmentCode,
            departmentName: customer.departmentName,
            ...(extras?.postalCode ? { postalCode: extras.postalCode } : {}),
            line: customer.line,
          },
        }
      : {}),
  };
}

export function toInvoiceRequest(
  invoice: InvoiceHeaderValues,
  customer: CustomerValues,
  lines: LineValues[],
  extras: CustomerExtras | null,
): InvoiceRequest {
  const { payment } = invoice;
  return {
    issuerId: invoice.issuerId,
    customer: toCustomerRequest(customer, extras),
    payment: {
      method: payment.method,
      meansCode: payment.meansCode,
      ...(payment.method === "CREDIT" ? { dueDate: payment.dueDate } : {}),
    },
    lines: lines.map(toLine),
  };
}
