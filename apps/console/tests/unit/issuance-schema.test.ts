import { type } from "arktype";
import { describe, expect, it } from "vite-plus/test";

import { nitCheckDigit } from "~/features/issuance/nitCheckDigit";
import {
  type InvoiceHeaderValues,
  invoiceHeaderSchema,
  linesFormSchema,
  pickedExtras,
  toInvoiceRequest,
} from "~/features/issuance/schema";

const invoice: InvoiceHeaderValues = {
  issuerId: "0b9f0d8e-7c5d-4a7e-9b1f-2c3d4e5f6a7b",
  customer: {
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
  },
  payment: { method: "CASH", meansCode: "10", dueDate: "" },
};

function errorsOf(value: unknown) {
  const result = invoiceHeaderSchema(value);
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
    if (parsed instanceof type.errors || lines instanceof type.errors) {
      throw new Error("The invoice should be valid");
    }
    const request = toInvoiceRequest(parsed, lines.lines, {
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
    const wrong = {
      ...invoice,
      customer: { ...invoice.customer, identificationNumber: "900999999-1" },
    };
    expect(errorsOf(wrong)).toEqual(["customer.identificationNumber"]);
  });

  it("asks for a due date on credit and for both parts of an address", () => {
    expect(
      errorsOf({ ...invoice, payment: { method: "CREDIT", meansCode: "10", dueDate: "" } }),
    ).toEqual(["payment.dueDate"]);
    expect(errorsOf({ ...invoice, customer: { ...invoice.customer, line: "" } })).toEqual([
      "customer.line",
    ]);
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

describe("messages", () => {
  it("names what is missing in Spanish", () => {
    const result = invoiceHeaderSchema({
      ...invoice,
      customer: { ...invoice.customer, identificationNumber: " ", legalName: "" },
    });
    if (!(result instanceof type.errors)) {
      throw new Error("The invoice should be invalid");
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
    expect(pickedExtras(picked, invoice.customer)).toEqual(picked.extras);
  });

  it("is dropped when the document type or number changes, or nothing was picked", () => {
    expect(
      pickedExtras(picked, { ...invoice.customer, identificationType: "PASSPORT" }),
    ).toBeNull();
    expect(
      pickedExtras(picked, { ...invoice.customer, identificationNumber: "800197268-4" }),
    ).toBeNull();
    expect(pickedExtras(null, invoice.customer)).toBeNull();
  });
});
