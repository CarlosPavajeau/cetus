import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { CetusApiError, api } from "~/lib/api/client";
import type { DocumentPreview, Environment, InvoiceRequest } from "~/lib/api/types";

import {
  customerExtrasSchema,
  customerFormSchema,
  invoiceHeaderSchema,
  linesSchema,
  toInvoiceRequest,
  toLine,
  trimmed,
} from "./schema";

/** Lines, taxes and totals as the API would issue them; null when the lines cannot be calculated. */
export const previewDocument = createServerFn({ method: "POST" })
  .validator(type({ lines: linesSchema }))
  .handler(async ({ data }): Promise<DocumentPreview | null> => {
    try {
      return await api.post("/console/documents/preview", {
        body: { lines: data.lines.map(toLine) },
      });
    } catch (error) {
      if (error instanceof CetusApiError && (error.status === 400 || error.status === 422)) {
        return null;
      }
      throw error;
    }
  });

const messages: Record<string, string> = {
  issuer_not_found: "El emisor ya no existe o no está en este ambiente.",
  issuer_not_ready: "El emisor no está habilitado para emitir documentos.",
  issuer_missing_software: "Al emisor le falta configurar el software de la DIAN.",
  issuer_missing_certificate: "Al emisor le falta el certificado de firma.",
  no_active_numbering_range:
    "El emisor no tiene un rango de numeración vigente para este documento. Agrégalo en el detalle del emisor.",
  customer_identification_invalid:
    "El número de identificación del cliente no tiene un formato válido.",
  customer_check_digit_invalid: "El dígito de verificación del NIT del cliente no corresponde.",
  payment_due_date_required: "Una venta a crédito necesita fecha de vencimiento.",
  invoice_not_accepted: "Solo se pueden emitir notas sobre facturas aceptadas por la DIAN.",
  credit_note_exceeds_balance: "La nota crédito supera lo que queda por acreditar de la factura.",
  sandbox_daily_limit:
    "Ya emitiste los documentos de simulación permitidos por hoy. Vuelve a intentarlo mañana.",
  organization_role_forbidden:
    "Solo los dueños, administradores y facturadores de la organización pueden emitir documentos en producción.",
  impersonation_forbidden: "Los documentos de producción solo los emite la persona de la cuenta.",
  account_suspended: "La cuenta está suspendida: no se pueden emitir documentos.",
  idempotency_in_progress: "El documento ya se está emitiendo. Espera unos segundos.",
  idempotency_mismatch:
    "Este formulario ya emitió un documento. Recarga la página para emitir otro.",
  invalid_request: "Revisa los datos del formulario.",
};

export type IssueResult =
  | { ok: true; id: string; number: string }
  | { ok: false; code: string; message: string };

function failure(error: unknown, fallback: string): IssueResult {
  if (error instanceof CetusApiError && error.status >= 400 && error.status < 500) {
    return { ok: false, code: error.code, message: messages[error.code] ?? fallback };
  }
  throw error;
}

/** Issues an invoice from the console form. The form sends one key while it lives: one invoice per form. */
export const issueInvoice = createServerFn({ method: "POST" })
  .validator(
    type({
      idempotencyKey: "string.uuid",
      invoice: invoiceHeaderSchema,
      customer: customerFormSchema,
      lines: linesSchema,
      customerExtras: customerExtrasSchema.or("null"),
      saveCustomer: type("'SANDBOX' | 'TEST' | 'LIVE'").or("null"),
    }),
  )
  .handler(async ({ data }): Promise<IssueResult> => {
    const request = toInvoiceRequest(data.invoice, data.customer, data.lines, data.customerExtras);
    let issued: IssueResult;
    try {
      issued = {
        ok: true,
        ...(await api.post("/console/documents/invoices", {
          params: { header: { "Idempotency-Key": data.idempotencyKey } },
          body: request,
        })),
      };
    } catch (error) {
      return failure(error, "No pudimos emitir la factura. Inténtalo de nuevo en unos minutos.");
    }
    if (data.saveCustomer) {
      await saveCustomer(data.saveCustomer, request.customer);
    }
    return issued;
  });

/**
 * Keeps the invoice's customer in the catalog of its environment. One already saved with that document is
 * left as it is: the invoice is issued either way, so the catalog never fails it.
 */
async function saveCustomer(environment: Environment, customer: InvoiceRequest["customer"]) {
  try {
    await api.post("/console/customers", { params: { query: { environment } }, body: customer });
  } catch (error) {
    if (!(error instanceof CetusApiError && error.code === "customer_exists")) {
      console.error("Invoice issued but its customer not saved", { environment, error });
    }
  }
}

const creditNoteConcept = type(
  "'PARTIAL_RETURN' | 'CANCELLATION' | 'REBATE' | 'PRICE_ADJUSTMENT' | 'EARLY_PAYMENT_DISCOUNT' | 'VOLUME_DISCOUNT'",
);
const debitNoteConcept = type("'INTEREST' | 'EXPENSES' | 'VALUE_CHANGE' | 'OTHER'");
const noteDescription = trimmed(
  "0 < string <= 500",
  "Explica el motivo de la nota (hasta 500 caracteres).",
);

/** What a note asks for besides its lines; the type of the note narrows the concept when it is issued. */
export const noteHeaderSchema = type({
  "+": "delete",
  concept: creditNoteConcept.or(debitNoteConcept),
  description: noteDescription,
});

export type NoteHeaderValues = typeof noteHeaderSchema.infer;

export const creditNoteSchema = type({
  "+": "delete",
  concept: creditNoteConcept,
  description: noteDescription,
  lines: linesSchema,
});

export const debitNoteSchema = type({
  "+": "delete",
  concept: debitNoteConcept,
  description: noteDescription,
  lines: linesSchema,
});

export type CreditNoteValues = typeof creditNoteSchema.infer;

export type DebitNoteValues = typeof debitNoteSchema.infer;

export const issueCreditNote = createServerFn({ method: "POST" })
  .validator(
    type({ invoiceId: "string.uuid", idempotencyKey: "string.uuid", note: creditNoteSchema }),
  )
  .handler(async ({ data }): Promise<IssueResult> => {
    try {
      const issued = await api.post("/console/documents/{id}/credit-notes", {
        params: {
          path: { id: data.invoiceId },
          header: { "Idempotency-Key": data.idempotencyKey },
        },
        body: { ...data.note, lines: data.note.lines.map(toLine) },
      });
      return { ok: true, ...issued };
    } catch (error) {
      return failure(
        error,
        "No pudimos emitir la nota crédito. Inténtalo de nuevo en unos minutos.",
      );
    }
  });

export const issueDebitNote = createServerFn({ method: "POST" })
  .validator(
    type({ invoiceId: "string.uuid", idempotencyKey: "string.uuid", note: debitNoteSchema }),
  )
  .handler(async ({ data }): Promise<IssueResult> => {
    try {
      const issued = await api.post("/console/documents/{id}/debit-notes", {
        params: {
          path: { id: data.invoiceId },
          header: { "Idempotency-Key": data.idempotencyKey },
        },
        body: { ...data.note, lines: data.note.lines.map(toLine) },
      });
      return { ok: true, ...issued };
    } catch (error) {
      return failure(
        error,
        "No pudimos emitir la nota débito. Inténtalo de nuevo en unos minutos.",
      );
    }
  });
