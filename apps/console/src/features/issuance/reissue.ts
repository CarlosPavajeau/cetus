import { presetOf, toCustomerValues } from "~/features/catalog/schema";
import type { DocumentDetail } from "~/lib/api/types";

import { creditConcepts, debitConcepts, paymentMeansCodes } from "./catalogs";
import type { NoteType } from "./NoteForm";
import type {
  CustomerExtras,
  CustomerValues,
  InvoiceHeaderValues,
  LineValues,
  PickedCustomer,
} from "./schema";
import type { NoteHeaderValues } from "./server";

/** What the form could not take from the original document, to fill in by hand. */
export type ReissueGaps = {
  issuer: boolean;
  customer: boolean;
  payment: boolean;
  lineCount: number;
};

/** A draft's lines may be empty when none fit the form; the form then starts with an empty one. */
export type InvoiceDraft = {
  id: string;
  number: string;
  status: "REJECTED" | "FAILED";
  issuerId: string;
  payment: InvoiceHeaderValues["payment"];
  customer: { values: CustomerValues; extras: CustomerExtras; picked: PickedCustomer } | null;
  lines: LineValues[];
  gaps: ReissueGaps;
};

export type NoteDraft = {
  id: string;
  number: string;
  status: "REJECTED" | "FAILED";
  header: NoteHeaderValues;
  lines: LineValues[];
  gaps: ReissueGaps;
};

type Reissuable = DocumentDetail & { status: "REJECTED" | "FAILED" };

function isReissuable(document: DocumentDetail): document is Reissuable {
  return document.status === "REJECTED" || document.status === "FAILED";
}

/** The concept of a note, when the note form offers it; a cancellation has its own dialog. */
function formConcept(document: DocumentDetail) {
  const concepts: readonly string[] =
    document.documentType === "CREDIT_NOTE" ? creditConcepts : debitConcepts;
  return [...creditConcepts, ...debitConcepts].find(
    (concept) => concept === document.concept && concepts.includes(concept),
  );
}

/**
 * Where "Emitir de nuevo" opens the form, or null when the document cannot be issued again from the
 * console: it was not rejected or failed, or it is a cancellation.
 */
export function reissueTarget(
  document: DocumentDetail,
):
  | { kind: "invoice"; from: string }
  | { kind: "note"; invoiceId: string; type: NoteType; from: string }
  | null {
  if (!isReissuable(document)) {
    return null;
  }
  if (document.documentType === "INVOICE") {
    return { kind: "invoice", from: document.id };
  }
  if (!document.invoice || !formConcept(document)) {
    return null;
  }
  return {
    kind: "note",
    invoiceId: document.invoice.id,
    type: document.documentType,
    from: document.id,
  };
}

function lineValues(document: DocumentDetail) {
  const lines = document.lines.flatMap((line): LineValues[] => {
    const tax = presetOf(line.taxes);
    return tax === null
      ? []
      : [
          {
            description: line.description,
            quantity: String(line.quantity),
            unitPrice: String(line.unitPrice),
            tax,
            unitCode: line.unitCode,
          },
        ];
  });
  return { lines, lineCount: document.lines.length - lines.length };
}

/** A rejected or failed invoice as the invoice form's values; null for any other document. */
export function invoiceDraft(document: DocumentDetail, issuerIds: string[]): InvoiceDraft | null {
  if (!isReissuable(document) || document.documentType !== "INVOICE") {
    return null;
  }
  const saved = toCustomerValues(document.customer);
  const meansCode = paymentMeansCodes.find((code) => code === document.payment?.meansCode);
  const { lines, lineCount } = lineValues(document);
  const issuerUsable = issuerIds.includes(document.issuer.id);
  return {
    id: document.id,
    number: document.number,
    status: document.status,
    issuerId: issuerUsable ? document.issuer.id : "",
    payment: {
      method: document.payment?.method ?? "CASH",
      meansCode: meansCode ?? "10",
      dueDate: document.payment?.dueDate ?? "",
    },
    customer: saved && {
      ...saved,
      picked: {
        identificationType: saved.values.identificationType,
        identificationNumber: saved.values.identificationNumber,
        extras: saved.extras,
      },
    },
    lines,
    gaps: {
      issuer: !issuerUsable,
      customer: saved === null,
      payment: meansCode === undefined,
      lineCount,
    },
  };
}

/** A rejected or failed note as the note form's values; null when it is not one the form can issue. */
export function noteDraft(document: DocumentDetail, noteType: NoteType): NoteDraft | null {
  const concept = formConcept(document);
  if (!isReissuable(document) || document.documentType !== noteType || !concept) {
    return null;
  }
  const { lines, lineCount } = lineValues(document);
  return {
    id: document.id,
    number: document.number,
    status: document.status,
    header: { concept, description: document.description ?? "" },
    lines,
    gaps: { issuer: false, customer: false, payment: false, lineCount },
  };
}
