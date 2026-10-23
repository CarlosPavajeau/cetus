import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { CetusApiError, api } from "~/lib/api/client";
import {
  type DocumentDetail,
  type DocumentFile,
  type DocumentPage,
  documentStatuses,
  documentTypes,
} from "~/lib/api/types";

export const documentFilters = type({
  "environment?": "'SANDBOX' | 'TEST' | 'LIVE' | undefined",
  "type?": type.enumerated(...documentTypes).or("undefined"),
  "status?": type.enumerated(...documentStatuses).or("undefined"),
  "issuerId?": "string.uuid | undefined",
  "from?": "string.date.iso | undefined",
  "to?": "string.date.iso | undefined",
  "q?": "string <= 100 | undefined",
});

export type DocumentFilters = typeof documentFilters.infer;

/** One page of the account's documents, newest first. */
export const listDocuments = createServerFn({ method: "GET" })
  .validator(documentFilters.and({ "before?": "string.uuid | undefined" }))
  .handler(({ data }): Promise<DocumentPage> =>
    api.get("/console/documents", { params: { query: { ...data, limit: 50 } } }),
  );

/** One document, or null when it does not exist or belongs to another account. */
export const getDocument = createServerFn({ method: "GET" })
  .validator(type({ id: "string.uuid" }))
  .handler(async ({ data }): Promise<DocumentDetail | null> => {
    try {
      return await api.get("/console/documents/{id}", { params: { path: { id: data.id } } });
    } catch (error) {
      if (error instanceof CetusApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  });

export type DocumentFileUrl = { url: string } | { url: null; message: string };

/** A short-lived download URL, or why there is none yet. */
export const getDocumentFileUrl = createServerFn({ method: "GET" })
  .validator(type({ id: "string.uuid", file: "'xml' | 'pdf' | 'attached-document'" }))
  .handler(async ({ data }): Promise<DocumentFileUrl> => {
    try {
      const { url } = await api.get("/console/documents/{id}/files/{file}", {
        params: { path: { id: data.id, file: data.file satisfies DocumentFile } },
      });
      return { url };
    } catch (error) {
      if (error instanceof CetusApiError && error.code === "file_not_available") {
        return { url: null, message: "El archivo todavía no está disponible." };
      }
      throw error;
    }
  });

const cancellationMessages: Record<string, string> = {
  invoice_not_accepted: "Solo se pueden anular facturas aceptadas por la DIAN.",
  credit_note_exceeds_balance:
    "La factura ya tiene notas crédito: la anulación total superaría su saldo. Emite una nota parcial por la API.",
  no_active_numbering_range:
    "El emisor no tiene un rango de numeración vigente para notas crédito. Agrégalo en el detalle del emisor.",
  issuer_not_ready: "El emisor no está habilitado para emitir documentos.",
  issuer_missing_software: "Al emisor le falta configurar el software de la DIAN.",
  issuer_missing_certificate: "Al emisor le falta el certificado de firma.",
  idempotency_in_progress: "La anulación ya se está procesando. Espera unos segundos.",
};

export type CancellationResult =
  | { ok: true; id: string; number: string }
  | { ok: false; code: string; message: string };

/**
 * Cancels an accepted invoice with a credit note for all of it. The key is generated when the dialog
 * opens, so submitting twice issues a single note.
 */
export const cancelInvoice = createServerFn({ method: "POST" })
  .validator(
    type({
      id: "string.uuid",
      idempotencyKey: "string.uuid",
      description: "string.trim |> 0 < string <= 500",
    }),
  )
  .handler(async ({ data }): Promise<CancellationResult> => {
    try {
      const note = await api.post("/console/documents/{id}/cancellation", {
        params: { path: { id: data.id }, header: { "Idempotency-Key": data.idempotencyKey } },
        body: { description: data.description },
      });
      return { ok: true, ...note };
    } catch (error) {
      if (error instanceof CetusApiError && (error.status === 409 || error.status === 422)) {
        return {
          ok: false,
          code: error.code,
          message:
            cancellationMessages[error.code] ??
            "No pudimos anular la factura. Inténtalo de nuevo en unos minutos.",
        };
      }
      throw error;
    }
  });
