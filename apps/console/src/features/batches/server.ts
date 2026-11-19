import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { CetusApiError, api } from "~/lib/api/client";
import type {
  BatchDocumentPage,
  BatchError,
  BatchPage,
  BatchView,
  SameFileResult,
} from "~/lib/api/types";

// The browser reads the file; these only forward what it found. The API validates every item again.

const code = /^[0-9A-Za-z-]{1,10}$/;

const batchItem = type({
  "+": "delete",
  reference: "0 < string <= 40",
  "currency?": /^[A-Z]{3}$/,
  customer: {
    "+": "delete",
    identificationType: type.enumerated(
      "CIVIL_REGISTRY",
      "IDENTITY_CARD",
      "CITIZEN_ID",
      "FOREIGNER_CARD",
      "FOREIGNER_ID",
      "NIT",
      "PASSPORT",
      "FOREIGN_DOCUMENT",
      "PEP",
      "FOREIGN_NIT",
      "NUIP",
    ),
    identificationNumber: "0 < string <= 20",
    "checkDigit?": /^\d$/,
    "personType?": "'LEGAL_ENTITY' | 'NATURAL_PERSON'",
    "legalName?": "string <= 450",
    "taxLevelCodes?": type("string <= 10").array().atMostLength(5),
    "taxScheme?": "'IVA' | 'NOT_APPLICABLE'",
    "address?": {
      "+": "delete",
      municipalityCode: code,
      cityName: "string <= 100",
      departmentCode: code,
      departmentName: "string <= 100",
      "postalCode?": code,
      line: "string <= 300",
      "countryCode?": /^[A-Z]{2}$/,
      "countryName?": "string <= 100",
    },
    "email?": "string <= 254",
    "phone?": "string <= 50",
  },
  payment: {
    "+": "delete",
    method: "'CASH' | 'CREDIT'",
    meansCode: /^[0-9A-Z]{1,3}$/,
    "dueDate?": /^\d{4}-\d{2}-\d{2}$/,
  },
  lines: type({
    "+": "delete",
    "productCode?": "string <= 50",
    "description?": "string <= 300",
    quantity: "number > 0",
    "unitCode?": /^[0-9A-Z]{1,3}$/,
    "unitPrice?": "number >= 0",
    "taxes?": type({ type: "'IVA' | 'ICA' | 'INC'", percent: "0 <= number <= 100" })
      .array()
      .atMostLength(5),
  })
    .array()
    .atLeastLength(1)
    .atMostLength(500),
  "notes?": type("string <= 500").array().atMostLength(20),
});

const batchErrors = type({
  errors: type({
    index: "number.integer >= 0",
    reference: "string | null",
    field: "string | null",
    code: "string",
    message: "string",
  }).array(),
});

const messages: Record<string, string> = {
  issuer_not_ready: "El emisor no está habilitado para emitir documentos.",
  issuer_missing_software: "Al emisor le falta configurar el software de la DIAN.",
  issuer_missing_certificate: "Al emisor le falta el certificado de firma.",
  no_active_numbering_range:
    "El emisor no tiene un rango de numeración vigente para facturas. Agrégalo en el detalle del emisor.",
  numbering_range_insufficient:
    "Al rango de numeración del emisor no le quedan números para todas estas facturas. Agrega un rango nuevo o divide el lote.",
  technical_key_pending:
    "Estamos trayendo la clave técnica del rango desde la DIAN. Vuelve a intentarlo en unos minutos.",
  too_many_open_batches:
    "Ya tienes el máximo de lotes en curso. Espera a que uno termine para enviar otro.",
  batch_too_large:
    "El lote es demasiado grande para enviarlo de una vez. Divídelo en varios archivos.",
  rate_limited: "Enviaste varios lotes seguidos. Espera un minuto y vuelve a intentarlo.",
  no_active_product:
    "Tu cuenta no tiene una suscripción ni un paquete vigente para emitir en producción.",
  insufficient_credits:
    "Tus créditos no alcanzan para todas las facturas del lote. Compra una recarga o divide el lote.",
  overage_limit_reached:
    "El lote supera el límite de excedente de tu suscripción en este periodo. El dueño de la cuenta puede ampliarlo en Facturación.",
  sandbox_daily_limit:
    "El lote supera los documentos de simulación que te quedan hoy. Divídelo o envíalo mañana.",
  organization_role_forbidden:
    "Solo los dueños, administradores y facturadores de la organización pueden emitir documentos en producción.",
  impersonation_forbidden: "Los documentos de producción solo los emite la persona de la cuenta.",
  account_suspended: "La cuenta está suspendida: no se pueden emitir documentos.",
  idempotency_in_progress: "El lote ya se está recibiendo. Espera unos segundos.",
  idempotency_mismatch: "Este envío ya creó un lote. Sube el archivo de nuevo para enviar otro.",
  invalid_batch: "Algunas facturas tienen errores.",
};

export type SendBatchResult =
  | { ok: true; id: string; items: number }
  | { ok: false; code: string; message: string; errors: BatchError[] };

/** Sends the batch. The page keeps one key until it gets an answer, so a retry after a lost one is the same batch. */
export const sendBatch = createServerFn({ method: "POST" })
  .validator(
    type({
      idempotencyKey: "string.uuid",
      issuerId: "string.uuid",
      fileName: "string <= 255",
      fileSha256: /^[0-9a-f]{64}$/,
      items: batchItem.array().atLeastLength(1).atMostLength(1000),
    }),
  )
  .handler(async ({ data }): Promise<SendBatchResult> => {
    try {
      const created = await api.post("/console/document-batches", {
        params: { header: { "Idempotency-Key": data.idempotencyKey } },
        body: {
          issuerId: data.issuerId,
          fileName: data.fileName,
          fileSha256: data.fileSha256,
          items: data.items,
        },
      });
      return { ok: true, id: created.id, items: created.items };
    } catch (error) {
      if (error instanceof CetusApiError && error.status >= 400 && error.status < 500) {
        const found = batchErrors(error.body);
        return {
          ok: false,
          code: error.code,
          message: messages[error.code] ?? "No pudimos recibir el lote. Revisa el archivo.",
          errors: found instanceof type.errors ? [] : found.errors,
        };
      }
      throw error;
    }
  });

/** The batch sent with the same file for the issuer in the last day, if any. */
export const findSameFile = createServerFn({ method: "GET" })
  .validator(type({ issuerId: "string.uuid", fileSha256: /^[0-9a-f]{64}$/ }))
  .handler(({ data }): Promise<SameFileResult> =>
    api.get("/console/document-batches/same-file", { params: { query: data } }),
  );

/** The account's batches in the environment, newest first. */
export const listBatches = createServerFn({ method: "GET" })
  .validator(
    type({ environment: "'SANDBOX' | 'TEST' | 'LIVE'", "before?": "string.uuid | undefined" }),
  )
  .handler(({ data }): Promise<BatchPage> =>
    api.get("/console/document-batches", { params: { query: { ...data, limit: 20 } } }),
  );

/** One batch, or null when it does not exist or belongs to another account. */
export const getBatch = createServerFn({ method: "GET" })
  .validator(type({ id: "string.uuid" }))
  .handler(async ({ data }): Promise<BatchView | null> => {
    try {
      return await api.get("/console/document-batches/{id}", { params: { path: { id: data.id } } });
    } catch (error) {
      if (error instanceof CetusApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  });

export const listBatchDocuments = createServerFn({ method: "GET" })
  .validator(type({ id: "string.uuid", "after?": "number.integer >= 0 | undefined" }))
  .handler(({ data }): Promise<BatchDocumentPage> =>
    api.get("/console/document-batches/{id}/documents", {
      params: { path: { id: data.id }, query: { after: data.after, limit: 50 } },
    }),
  );

/** The batch's result as the CSV the API writes, for the browser to save. */
export const getBatchResult = createServerFn({ method: "GET" })
  .validator(type({ id: "string.uuid" }))
  .handler(async ({ data }): Promise<string> => {
    const csv: unknown = await api.get("/console/document-batches/{id}/result.csv", {
      params: { path: { id: data.id } },
      parseAs: "text",
    });
    if (typeof csv !== "string") {
      throw new Error("The batch result is not text");
    }
    return csv;
  });
