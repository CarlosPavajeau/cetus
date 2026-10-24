import { describe, expect, it } from "vite-plus/test";

import {
  customerUnavailable,
  productUnavailable,
  toCustomerValues,
  toLineValues,
} from "~/features/catalog/schema";
import type { Customer, Product } from "~/lib/api/types";

const customer: Customer = {
  id: crypto.randomUUID(),
  environment: "SANDBOX",
  personType: "LEGAL_ENTITY",
  identificationType: "NIT",
  identificationNumber: "900123456",
  checkDigit: "8",
  legalName: "Comprador SAS",
  tradeName: "Comprador",
  taxLevelCodes: ["O-13", "O-15"],
  taxScheme: "IVA",
  address: {
    municipalityCode: "11001",
    cityName: "Bogotá, D.C.",
    departmentCode: "11",
    departmentName: "Bogotá, D.C.",
    postalCode: "110111",
    line: "Calle 100 # 10-20",
    countryCode: "CO",
    countryName: "Colombia",
  },
  email: "compras@comprador.test",
  phone: "6015550000",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const product: Product = {
  id: crypto.randomUUID(),
  environment: "SANDBOX",
  code: "CAF-1",
  description: "Café en grano",
  unitCode: "KGM",
  unitPrice: 42000,
  taxes: [{ type: "IVA", percent: 5 }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("toCustomerValues", () => {
  it("keeps everything saved: responsibilities in the form, the rest beside it", () => {
    expect(toCustomerValues(customer)).toEqual({
      values: expect.objectContaining({
        identificationNumber: "900123456-8",
        taxLevelCodes: ["O-13", "O-15"],
        municipalityCode: "11001",
      }),
      extras: { tradeName: "Comprador", phone: "6015550000", postalCode: "110111" },
    });
  });

  it("refuses what the form cannot hold whole", () => {
    const foreign: Customer = {
      ...customer,
      address: customer.address && { ...customer.address, countryCode: "US" },
    };
    for (const unsupported of [
      { ...customer, identificationType: "FOREIGN_NIT" } satisfies Customer,
      { ...customer, taxLevelCodes: ["O-99"] } satisfies Customer,
      foreign,
    ]) {
      expect(toCustomerValues(unsupported)).toBeNull();
      expect(customerUnavailable(unsupported)).toBe("solo por API");
    }
    expect(customerUnavailable(customer)).toBeNull();
  });
});

describe("toLineValues", () => {
  it("keeps the product's unit", () => {
    expect(toLineValues(product)).toEqual({
      description: "Café en grano",
      quantity: "1",
      unitPrice: "42000",
      tax: "IVA_5",
      unitCode: "KGM",
    });
  });

  it("refuses taxes that are not a preset", () => {
    const special: Product = { ...product, taxes: [{ type: "IVA", percent: 16 }] };
    expect(toLineValues(special)).toBeNull();
    expect(productUnavailable(special)).toBe("impuestos solo por API");
  });
});
