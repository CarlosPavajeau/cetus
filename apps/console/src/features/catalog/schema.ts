import { type } from "arktype";

import { type TaxPreset, taxPresetIds, taxPresets } from "~/features/issuance/catalogs";
import type { CustomerExtras, InvoiceHeaderValues, LineValues } from "~/features/issuance/schema";
import { trimmed } from "~/features/issuance/schema";
import { isTaxLevelCode } from "~/features/setup/taxLevels";
import type { Customer, LineTax, Product } from "~/lib/api/types";

/** The longest search the catalogs take; the inputs stop there, and the server refuses more. */
export const searchLengthMax = 100;

export const productSchema = type({
  "+": "delete",
  code: trimmed("0 < string <= 50", "Escribe un código de hasta 50 caracteres."),
  description: trimmed(
    "0 < string <= 300",
    "Describe el producto o servicio (hasta 300 caracteres).",
  ),
  unitPrice: type(/^\d{1,14}(\.\d{1,6})?$/).configure({
    message: "Escribe el precio sin puntos de miles.",
  }),
  tax: type.enumerated(...taxPresetIds),
});

export type ProductValues = typeof productSchema.infer;

export function toProductRequest(product: ProductValues) {
  return {
    code: product.code,
    description: product.description,
    unitPrice: Number(product.unitPrice),
    taxes: taxPresets[product.tax].taxes,
  };
}

/** The preset whose taxes are exactly these, or null for a combination the form does not offer. */
export function presetOf(taxes: LineTax[]): TaxPreset | null {
  return (
    taxPresetIds.find((preset) => {
      const expected = taxPresets[preset].taxes;
      return (
        expected.length === taxes.length &&
        expected.every((tax, index) => {
          const actual = taxes[index];
          return actual !== undefined && actual.type === tax.type && actual.percent === tax.percent;
        })
      );
    }) ?? null
  );
}

/** Why a saved product cannot fill a line of the form, or null when it can. */
export function productUnavailable(product: Product): string | null {
  return presetOf(product.taxes) === null ? "impuestos solo por API" : null;
}

/** A saved product as a line of the form, with its own unit; null when its taxes are not a preset. */
export function toLineValues(product: Product): LineValues | null {
  const tax = presetOf(product.taxes);
  return tax === null
    ? null
    : {
        description: product.description,
        quantity: "1",
        unitPrice: String(product.unitPrice),
        tax,
        unitCode: product.unitCode,
      };
}

const formIdentificationTypes = [
  "NIT",
  "CITIZEN_ID",
  "FOREIGNER_ID",
  "PASSPORT",
  "PEP",
  "FOREIGN_DOCUMENT",
] as const;

/**
 * Why a saved customer cannot fill the form without losing data, or null when it can: a document the form
 * does not offer, a foreign address or a responsibility outside table 13.2.6.1.
 */
export function customerUnavailable(customer: Customer): string | null {
  return toCustomerValues(customer) === null ? "solo por API" : null;
}

/**
 * A saved customer as the form's customer and what travels beside it, or null when the form cannot hold it
 * whole. Nothing saved is replaced by a default.
 */
export function toCustomerValues(
  customer: Customer,
): { values: InvoiceHeaderValues["customer"]; extras: CustomerExtras } | null {
  const identificationType = formIdentificationTypes.find(
    (value) => value === customer.identificationType,
  );
  const taxLevels = customer.taxLevelCodes.filter(isTaxLevelCode);
  const address = customer.address;
  if (
    !identificationType ||
    taxLevels.length !== customer.taxLevelCodes.length ||
    (address !== null && address.countryCode !== "CO")
  ) {
    return null;
  }
  return {
    values: {
      personType: customer.personType,
      identificationType,
      identificationNumber: customer.checkDigit
        ? `${customer.identificationNumber}-${customer.checkDigit}`
        : customer.identificationNumber,
      legalName: customer.legalName,
      email: customer.email ?? "",
      responsibleForIva: customer.taxScheme === "IVA",
      taxLevelCodes: taxLevels.length > 0 ? taxLevels : ["R-99-PN"],
      departmentCode: address?.departmentCode ?? "",
      departmentName: address?.departmentName ?? "",
      municipalityCode: address?.municipalityCode ?? "",
      cityName: address?.cityName ?? "",
      line: address?.line ?? "",
    },
    extras: {
      ...(customer.tradeName ? { tradeName: customer.tradeName } : {}),
      ...(customer.phone ? { phone: customer.phone } : {}),
      ...(address?.postalCode ? { postalCode: address.postalCode } : {}),
    },
  };
}
