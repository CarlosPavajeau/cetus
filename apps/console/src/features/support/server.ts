import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { CetusApiError, api } from "~/lib/api/client";
import type { SupportTicketPage } from "~/lib/api/types";

import { attachmentSchema, feedbackSchema, ticketSchema } from "./schema";

const messages: Record<string, string> = {
  support_too_many:
    "Ya enviaste varios mensajes en la última hora. Espera unos minutos o escríbenos respondiendo el correo de tu caso.",
  attachment_type_unsupported: "Adjunta imágenes JPEG, PNG, GIF o WebP, o archivos PDF.",
  attachment_too_large: "Cada adjunto puede pesar hasta 5 MB.",
  attachment_invalid: "No pudimos leer el archivo. Inténtalo con otro.",
  attachment_not_found: "Uno de los adjuntos ya no está disponible. Quítalo y súbelo de nuevo.",
  impersonation_forbidden:
    "Mientras entras como otra persona no puedes escribir a soporte por ella.",
};

/** An upload shares the API's code for too many requests, but its limit counts the organization's files. */
const uploadMessages: Record<string, string> = {
  ...messages,
  support_too_many:
    "Tu organización subió muchos archivos en la última hora. Espera unos minutos e inténtalo de nuevo.",
};

function userError(error: unknown, known = messages): unknown {
  if (error instanceof CetusApiError && known[error.code]) {
    return new Error(known[error.code], { cause: error });
  }
  return error;
}

/** The organization's tickets, newest first. */
export const listSupportTickets = createServerFn({ method: "GET" })
  .validator(type({ "before?": "string.uuid | undefined" }))
  .handler(({ data }): Promise<SupportTicketPage> =>
    api.get("/console/support-tickets", { params: { query: { before: data.before, limit: 20 } } }),
  );

export const createSupportTicket = createServerFn({ method: "POST" })
  .validator(ticketSchema)
  .handler(async ({ data }) => {
    try {
      return await api.post("/console/support-tickets", { body: data });
    } catch (error) {
      throw userError(error);
    }
  });

/** One file, uploaded as soon as it is chosen; the ticket names it when sent. */
export const uploadSupportAttachment = createServerFn({ method: "POST" })
  .validator(attachmentSchema)
  .handler(async ({ data }) => {
    try {
      return await api.post("/console/support-attachments", { body: data });
    } catch (error) {
      throw userError(error, uploadMessages);
    }
  });

export const sendFeedback = createServerFn({ method: "POST" })
  .validator(feedbackSchema)
  .handler(async ({ data }) => {
    try {
      await api.post("/console/feedback", { body: data });
    } catch (error) {
      throw userError(error);
    }
  });
