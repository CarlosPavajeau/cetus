import { describe, expect, it } from "vite-plus/test";

import { invoiceDraft, noteDraft, reissueTarget } from "~/features/issuance/reissue";
import type { DocumentDetail } from "~/lib/api/types";

const issuerId = crypto.randomUUID();

const rejected: DocumentDetail = {
  id: crypto.randomUUID(),
  environment: "TEST",
  documentType: "INVOICE",
  number: "SETP990000001",
  status: "REJECTED",
  cufe: null,
  issueDate: "2026-11-09",
  dueDate: "2026-12-09",
  currency: "COP",
  issuer: { id: issuerId, legalName: "Emisor SAS", nit: "900123456", checkDigit: "8" },
  customer: {
    personType: "LEGAL_ENTITY",
    identificationType: "NIT",
    identificationNumber: "800197268",
    checkDigit: "4",
    legalName: "Comprador SAS",
    tradeName: "Comprador",
    taxLevelCodes: ["O-13"],
    taxScheme: "IVA",
    address: {
      municipalityCode: "11001",
      cityName: "Bogotá, D.C.",
      departmentCode: "11",
      departmentName: "Bogotá, D.C.",
      postalCode: null,
      line: "Calle 100 # 10-20",
      countryCode: "CO",
      countryName: "Colombia",
    },
    email: "compras@comprador.test",
    phone: null,
  },
  payment: { method: "CREDIT", meansCode: "47", dueDate: "2026-12-09" },
  lines: [
    {
      lineNumber: 1,
      itemCode: "1",
      description: "Asesoría",
      quantity: 2,
      unitCode: "94",
      unitPrice: 50000,
      lineExtension: 100000,
      taxes: [{ type: "IVA", percent: 19 }],
    },
    {
      lineNumber: 2,
      itemCode: "2",
      description: "Bolsa",
      quantity: 1,
      unitCode: "94",
      unitPrice: 1000,
      lineExtension: 1000,
      taxes: [{ type: "ICA", percent: 1 }],
    },
  ],
  taxes: [],
  totals: { lineExtension: 101000, taxExclusive: 101000, taxInclusive: 120010, payable: 120010 },
  dian: { statusCode: "99", statusMessage: null, errors: [], validatedAt: null },
  externalReference: null,
  createdAt: new Date().toISOString(),
  creditNotes: [],
  debitNotes: [],
  balance: null,
  invoice: null,
  concept: null,
  description: null,
  deliveries: [],
  events: [],
};

const invoiceRef = { id: crypto.randomUUID(), number: "SETP990000000", cufe: null };

describe("invoiceDraft", () => {
  it("copies the issuer, the customer, the payment and the lines the form can hold", () => {
    const draft = invoiceDraft(rejected, [issuerId]);

    expect(draft?.issuerId).toBe(issuerId);
    expect(draft?.customer?.values.identificationNumber).toBe("800197268-4");
    expect(draft?.customer?.values.responsibleForIva).toBe(true);
    expect(draft?.customer?.extras.tradeName).toBe("Comprador");
    expect(draft?.payment).toEqual({ method: "CREDIT", meansCode: "47", dueDate: "2026-12-09" });
    expect(draft?.lines).toEqual([
      { description: "Asesoría", quantity: "2", unitPrice: "50000", tax: "IVA_19", unitCode: "94" },
    ]);
    expect(draft?.gaps).toEqual({ issuer: false, customer: false, payment: false, lineCount: 1 });
  });

  it("leaves out an issuer that can no longer issue and a customer the form cannot hold", () => {
    const draft = invoiceDraft(
      { ...rejected, customer: { ...rejected.customer, identificationType: "NUIP" } },
      [],
    );

    expect(draft?.issuerId).toBe("");
    expect(draft?.customer).toBeNull();
    expect(draft?.gaps.issuer).toBe(true);
    expect(draft?.gaps.customer).toBe(true);
  });

  it("only drafts rejected or failed invoices", () => {
    expect(invoiceDraft({ ...rejected, status: "ACCEPTED" }, [issuerId])).toBeNull();
    expect(invoiceDraft({ ...rejected, status: "FAILED" }, [issuerId])?.status).toBe("FAILED");
  });
});

describe("reissueTarget", () => {
  it("opens the invoice form for an invoice and the note form for a note of its invoice", () => {
    expect(reissueTarget(rejected)).toEqual({ kind: "invoice", from: rejected.id });

    const note: DocumentDetail = {
      ...rejected,
      documentType: "DEBIT_NOTE",
      invoice: invoiceRef,
      concept: "INTEREST",
      description: "Mora",
      payment: null,
    };
    expect(reissueTarget(note)).toEqual({
      kind: "note",
      invoiceId: invoiceRef.id,
      type: "DEBIT_NOTE",
      from: note.id,
    });
    expect(noteDraft(note, "DEBIT_NOTE")?.header).toEqual({
      concept: "INTEREST",
      description: "Mora",
    });
    expect(noteDraft(note, "CREDIT_NOTE")).toBeNull();
  });

  it("leaves a cancellation to its own dialog", () => {
    const cancellation: DocumentDetail = {
      ...rejected,
      documentType: "CREDIT_NOTE",
      invoice: invoiceRef,
      concept: "CANCELLATION",
      payment: null,
    };

    expect(reissueTarget(cancellation)).toBeNull();
    expect(reissueTarget({ ...rejected, status: "ACCEPTED" })).toBeNull();
  });
});
