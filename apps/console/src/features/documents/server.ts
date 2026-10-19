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
  "environment?": "'TEST' | 'LIVE' | undefined",
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
