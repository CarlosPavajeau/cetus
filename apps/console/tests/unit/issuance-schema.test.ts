import { type } from "arktype";
import { describe, expect, it } from "vite-plus/test";

import { nitCheckDigit } from "~/features/issuance/nitCheckDigit";
import {
  type CustomerValues,
  type InvoiceHeaderValues,
  customerFormSchema,
  invoiceHeaderSchema,
  linesFormSchema,
  pickedExtras,
  toCustomerRequest,
  toInvoiceRequest,
} from "~/features/issuance/schema";

const invoice: InvoiceHeaderValues = {
  issuerId: crypto.randomUUID(),
  payment: { method: "CASH", meansCode: "10", dueDate: "" },
};

const customer: CustomerValues = {
  personType: "LEGAL_ENTITY",
  identificationType: "NIT",
  identificationNumber: "900999999-4",
  legalName: "Cliente de Ejemplo SAS",
  email: "",
  responsibleForIva: true,
  taxLevelCodes: ["O-13"],
  departmentCode: "11",
  departmentName: "Bogotá, D.C.",
  municipalityCode: "11001",
  cityName: "Bogotá, D.C.",
  line: "Calle 100 # 10-20",
};

function errorsOf(value: unknown) {
  const result = invoiceHeaderSchema(value);
  return result instanceof type.errors ? result.map((error) => error.propString) : [];
}

function customerErrorsOf(value: unknown) {
  const result = customerFormSchema(value);
  return result instanceof type.errors ? result.map((error) => error.propString) : [];
}

describe("nitCheckDigit", () => {
  it("computes the DIAN verification digit", () => {
    expect(nitCheckDigit("900999999")).toBe("4");
    expect(nitCheckDigit("900123456")).toBe("8");
    expect(nitCheckDigit("800197268")).toBe("4");
    expect(nitCheckDigit("12a")).toBeNull();
  });
});

describe("invoiceHeaderSchema", () => {
  it("accepts a complete invoice and maps it to the API request", () => {
    const parsed = invoiceHeaderSchema(invoice);
    const buyer = customerFormSchema(customer);
    const lines = linesFormSchema({
      lines: [
        {
          description: " Asesoría ",
          quantity: "2",
          unitPrice: "150000.5",
          tax: "EXCLUDED",
          unitCode: "HUR",
        },
      ],
    });
    if (
      parsed instanceof type.errors ||
      buyer instanceof type.errors ||
      lines instanceof type.errors
    ) {
      throw new Error("The invoice should be valid");
    }
    const request = toInvoiceRequest(parsed, buyer, lines.lines, {
      tradeName: "Ejemplo",
      postalCode: "110111",
    });
    expect(request.customer).toMatchObject({
      identificationNumber: "900999999",
      checkDigit: "4",
      tradeName: "Ejemplo",
      taxLevelCodes: ["O-13"],
      taxScheme: "IVA",
      address: { municipalityCode: "11001", postalCode: "110111", line: "Calle 100 # 10-20" },
    });
    expect(request.customer).not.toHaveProperty("email");
    expect(request.customer).not.toHaveProperty("phone");
    expect(request.payment).toEqual({ method: "CASH", meansCode: "10" });
    expect(request.lines).toEqual([
      {
        itemCode: "1",
        description: "Asesoría",
        quantity: 2,
        unitCode: "HUR",
        unitPrice: 150000.5,
        taxes: [],
      },
    ]);
  });

  it("rejects a wrong verification digit", () => {
    expect(customerErrorsOf({ ...customer, identificationNumber: "900999999-1" })).toEqual([
      "identificationNumber",
    ]);
  });

  it("asks for a due date on credit and for both parts of an address", () => {
    expect(
      errorsOf({ ...invoice, payment: { method: "CREDIT", meansCode: "10", dueDate: "" } }),
    ).toEqual(["payment.dueDate"]);
    expect(customerErrorsOf({ ...customer, line: "" })).toEqual(["line"]);
  });

  it("validates the lines on their own", () => {
    expect(linesFormSchema({ lines: [] })).toBeInstanceOf(type.errors);
    expect(
      linesFormSchema({
        lines: [{ description: "x", quantity: "0", unitPrice: "1", tax: "IVA_19", unitCode: "94" }],
      }),
    ).toBeInstanceOf(type.errors);
    expect(
      linesFormSchema({
        lines: [
          { description: "x", quantity: "1.5", unitPrice: "1000", tax: "IVA_19", unitCode: "94" },
        ],
      }),
    ).not.toBeInstanceOf(type.errors);
  });
});

describe("toCustomerRequest", () => {
  it("keeps what the form does not show and leaves out what is empty", () => {
    expect(
      toCustomerRequest({ ...customer, municipalityCode: "", line: "" }, { phone: "6015550000" }),
    ).toEqual({
      personType: "LEGAL_ENTITY",
      identificationType: "NIT",
      identificationNumber: "900999999",
      checkDigit: "4",
      legalName: "Cliente de Ejemplo SAS",
      taxLevelCodes: ["O-13"],
      taxScheme: "IVA",
      phone: "6015550000",
    });
  });
});

describe("messages", () => {
  it("names what is missing in Spanish", () => {
    const result = customerFormSchema({ ...customer, identificationNumber: " ", legalName: "" });
    if (!(result instanceof type.errors)) {
      throw new Error("The customer should be invalid");
    }
    expect(result.map((error) => error.message)).toEqual([
      "Escribe el número de identificación.",
      "Escribe el nombre o la razón social.",
    ]);
  });
});

describe("pickedExtras", () => {
  const picked = {
    identificationType: "NIT",
    identificationNumber: "900999999-4",
    extras: { tradeName: "Ejemplo", phone: "6015550000" },
  } as const;

  it("travels while the form holds the picked customer", () => {
    expect(pickedExtras(picked, customer)).toEqual(picked.extras);
  });

  it("is dropped when the document type or number changes, or nothing was picked", () => {
    expect(pickedExtras(picked, { ...customer, identificationType: "PASSPORT" })).toBeNull();
    expect(pickedExtras(picked, { ...customer, identificationNumber: "800197268-4" })).toBeNull();
    expect(pickedExtras(null, customer)).toBeNull();
  });
});
