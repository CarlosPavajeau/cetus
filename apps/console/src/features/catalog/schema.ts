import { type } from "arktype";

import { type TaxPreset, taxPresetIds, taxPresets } from "~/features/issuance/catalogs";
import type { InvoiceHeaderValues, LineValues } from "~/features/issuance/schema";
import { trimmed } from "~/features/issuance/schema";
import type { Customer, LineTax, Product, ProductPage } from "~/lib/api/types";

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

/** A saved product as a line of the form, or null when its taxes are not among the presets. */
export function toLineValues(product: Product): LineValues | null {
  const tax = presetOf(product.taxes);
  return tax === null
    ? null
    : {
        description: product.description,
        quantity: "1",
        unitPrice: String(product.unitPrice),
        tax,
      };
}

export type ProductsPage = ProductPage;

const formIdentificationTypes = [
  "NIT",
  "CITIZEN_ID",
  "FOREIGNER_ID",
  "PASSPORT",
  "PEP",
  "FOREIGN_DOCUMENT",
] as const;

/** A saved customer as the form's customer, or null when its document is not one the form offers. */
export function toCustomerValues(customer: Customer): InvoiceHeaderValues["customer"] | null {
  const identificationType = formIdentificationTypes.find(
    (value) => value === customer.identificationType,
  );
  if (!identificationType) {
    return null;
  }
  return {
    personType: customer.personType,
    identificationType,
    identificationNumber: customer.checkDigit
      ? `${customer.identificationNumber}-${customer.checkDigit}`
      : customer.identificationNumber,
    legalName: customer.legalName,
    email: customer.email ?? "",
    responsibleForIva: customer.taxScheme === "IVA",
    departmentCode: customer.address?.departmentCode ?? "",
    departmentName: customer.address?.departmentName ?? "",
    municipalityCode: customer.address?.municipalityCode ?? "",
    cityName: customer.address?.cityName ?? "",
    line: customer.address?.line ?? "",
  };
}
