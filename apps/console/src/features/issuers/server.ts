import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { CetusApiError, api } from "~/lib/api/client";
import type { IssuerDetail } from "~/lib/api/types";

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
