import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { CetusApiError, api } from "~/lib/api/client";
import type { IssuerDetail } from "~/lib/api/types";

import { noteRangeSchema } from "./noteRangeSchema";

export const listIssuers = createServerFn({ method: "GET" }).handler(() =>
  api.get("/console/issuers"),
);

/** One issuer with its setup pieces, or null when it does not exist or belongs to another account. */
export const getIssuer = createServerFn({ method: "GET" })
  .validator(type({ id: "string.uuid" }))
  .handler(async ({ data }): Promise<IssuerDetail | null> => {
    try {
      return await api.get("/console/issuers/{id}", { params: { path: { id: data.id } } });
    } catch (error) {
      if (error instanceof CetusApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  });

const promotionMessages: Record<string, string> = {
  issuer_not_promotable: "Solo un emisor de pruebas en habilitación puede pasar a producción.",
  issuer_already_promoted: "Este NIT ya tiene su emisor de producción.",
  issuer_limit_reached:
    "Tu plan no incluye más emisores en producción. Elige una suscripción o un paquete que incluya más emisores.",
  no_active_product:
    "Para tener emisores en producción necesitas una suscripción o un paquete vigente.",
};

/** Creates the production issuer of a test issuer in habilitación and returns it. */
export const promoteIssuer = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid" }))
  .handler(async ({ data }) => {
    try {
      return await api.post("/console/issuers/{id}/promote", { params: { path: { id: data.id } } });
    } catch (error) {
      if (error instanceof CetusApiError) {
        throw new Error(
          promotionMessages[error.code] ??
            "No pudimos crear el emisor de producción. Inténtalo de nuevo en unos minutos.",
          { cause: error },
        );
      }
      throw error;
    }
  });

/** Adds a range for credit or debit notes, which need no resolution. */
export const addNoteRange = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid", range: noteRangeSchema }))
  .handler(async ({ data: { id, range } }) => {
    try {
      return await api.post("/console/issuers/{id}/numbering-ranges", {
        params: { path: { id } },
        body: {
          documentType: range.documentType,
          prefix: range.prefix.toUpperCase(),
          from: Number(range.from),
          to: Number(range.to),
        },
      });
    } catch (error) {
      if (error instanceof CetusApiError) {
        throw new Error(
          error.code === "range_invalid"
            ? "El número inicial debe ser menor o igual al número final."
            : "No pudimos agregar el rango. Inténtalo de nuevo en unos minutos.",
          { cause: error },
        );
      }
      throw error;
    }
  });

const verificationMessages: Record<string, string> = {
  issuer_not_ready:
    "El emisor necesita su software DIAN y su certificado antes de consultar a la DIAN.",
  range_not_verifiable: "Solo los rangos de factura están autorizados por la DIAN.",
};

/** Discards an invoice range's technical key so the worker takes the DIAN's (GetNumberingRange). */
export const requestDianTechnicalKey = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid", rangeId: "string.uuid" }))
  .handler(async ({ data }) => {
    try {
      return await api.post(
        "/console/issuers/{id}/numbering-ranges/{rangeId}/technical-key-from-dian",
        { params: { path: { id: data.id, rangeId: data.rangeId } } },
      );
    } catch (error) {
      if (error instanceof CetusApiError) {
        throw new Error(
          verificationMessages[error.code] ??
            "No pudimos pedir la clave a la DIAN. Inténtalo de nuevo en unos minutos.",
          { cause: error },
        );
      }
      throw error;
    }
  });

/** Asks the worker to compare an invoice range with the DIAN's record (GetNumberingRange) again. */
export const verifyRange = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid", rangeId: "string.uuid" }))
  .handler(async ({ data }) => {
    try {
      return await api.post("/console/issuers/{id}/numbering-ranges/{rangeId}/verification", {
        params: { path: { id: data.id, rangeId: data.rangeId } },
      });
    } catch (error) {
      if (error instanceof CetusApiError) {
        throw new Error(
          verificationMessages[error.code] ??
            "No pudimos pedir la verificación. Inténtalo de nuevo en unos minutos.",
          { cause: error },
        );
      }
      throw error;
    }
  });
