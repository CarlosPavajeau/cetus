import { type } from "arktype";

import type { InvoiceLine, InvoiceRequest } from "~/lib/api/types";

import { identificationTypes, paymentMeansCodes, taxPresetIds, taxPresets } from "./catalogs";
import { nitCheckDigit } from "./nitCheckDigit";

// Shared by the issuance forms and the server functions that receive them.

/** Trims the text, then checks it, so the message names what is wrong with what remains. */
export const trimmed = (
  constraint:
    | "string > 0"
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

const customerSchema = type({
  "+": "delete",
  personType: "'LEGAL_ENTITY' | 'NATURAL_PERSON'",
  identificationType: type.enumerated(...identificationTypes.map((option) => option.value)),
  identificationNumber: required("Escribe el número de identificación."),
  legalName: trimmed("0 < string <= 450", "Escribe el nombre o la razón social."),
  email: trimmed("string.email | ''", "Escribe un correo válido o déjalo vacío."),
  responsibleForIva: "boolean",
  departmentCode: "string",
  departmentName: "string",
  municipalityCode: "string",
  cityName: "string",
  line: trimmed("string <= 300", "La dirección tiene hasta 300 caracteres."),
});

/** Everything an invoice needs but its lines. */
export const invoiceHeaderSchema = type({
  "+": "delete",
  issuerId: type("string.uuid").configure({ message: "Elige el emisor." }),
  customer: customerSchema,
  payment: {
    method: "'CASH' | 'CREDIT'",
    meansCode: type.enumerated(...paymentMeansCodes),
    dueDate: "string",
  },
}).narrow((invoice, ctx) => {
  const { customer, payment } = invoice;
  if (customer.identificationType === "NIT") {
    const parts = splitNit(customer.identificationNumber);
    if (!parts) {
      return ctx.reject({
        path: ["customer", "identificationNumber"],
        message:
          "Escribe el NIT con solo números; el dígito de verificación va opcional tras un guion.",
      });
    }
    const expected = nitCheckDigit(parts.nit);
    if (parts.checkDigit !== null && parts.checkDigit !== expected) {
      return ctx.reject({
        path: ["customer", "identificationNumber"],
        message: `El dígito de verificación de ese NIT es ${expected}.`,
      });
    }
  } else if (
    !identificationPattern(customer.identificationType).test(customer.identificationNumber)
  ) {
    return ctx.reject({
      path: ["customer", "identificationNumber"],
      message:
        customer.identificationType === "PASSPORT" ||
        customer.identificationType === "PEP" ||
        customer.identificationType === "FOREIGN_DOCUMENT"
          ? "Usa solo letras, números y guiones, hasta 20 caracteres."
          : "Escribe solo números, hasta 20.",
    });
  }
  if (customer.municipalityCode && !customer.line) {
    return ctx.reject({ path: ["customer", "line"], message: "Escribe la dirección." });
  }
  if (customer.line && !customer.municipalityCode) {
    return ctx.reject({
      path: ["customer", "municipalityCode"],
      message: "Busca el municipio de la dirección.",
    });
  }
  if (payment.method === "CREDIT" && !/^\d{4}-\d{2}-\d{2}$/.test(payment.dueDate)) {
    return ctx.reject({
      path: ["payment", "dueDate"],
      message: "Una venta a crédito necesita fecha de vencimiento.",
    });
  }
  return true;
});

export type InvoiceHeaderValues = typeof invoiceHeaderSchema.infer;

function identificationPattern(
  identificationType: InvoiceHeaderValues["customer"]["identificationType"],
) {
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
    unitPrice: Number(line.unitPrice),
    taxes: taxPresets[line.tax].taxes,
  };
}

export function toInvoiceRequest(
  invoice: InvoiceHeaderValues,
  lines: LineValues[],
): InvoiceRequest {
  const { customer, payment } = invoice;
  const nit =
    customer.identificationType === "NIT" ? splitNit(customer.identificationNumber) : null;
  return {
    issuerId: invoice.issuerId,
    customer: {
      personType: customer.personType,
      identificationType: customer.identificationType,
      identificationNumber: nit ? nit.nit : customer.identificationNumber,
      ...(nit?.checkDigit ? { checkDigit: nit.checkDigit } : {}),
      legalName: customer.legalName,
      taxScheme: customer.responsibleForIva ? "IVA" : "NOT_APPLICABLE",
      ...(customer.email ? { email: customer.email } : {}),
      ...(customer.municipalityCode
        ? {
            address: {
              municipalityCode: customer.municipalityCode,
              cityName: customer.cityName,
              departmentCode: customer.departmentCode,
              departmentName: customer.departmentName,
              line: customer.line,
            },
          }
        : {}),
    },
    payment: {
      method: payment.method,
      meansCode: payment.meansCode,
      ...(payment.method === "CREDIT" ? { dueDate: payment.dueDate } : {}),
    },
    lines: lines.map(toLine),
  };
}
