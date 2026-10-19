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
