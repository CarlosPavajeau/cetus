import { type } from "arktype";

import type { SupportTicketPriority, SupportTicketStatus } from "~/lib/api/types";

export const priorities = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const satisfies readonly SupportTicketPriority[];

export const ticketStatuses = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
] as const satisfies readonly SupportTicketStatus[];

/** As the API takes them: five files of up to 5 MB, recognized there by their bytes. */
export const attachmentsMax = 5;
export const attachmentBytesMax = 5 * 1024 * 1024;
export const attachmentAccept = "image/jpeg,image/png,image/gif,image/webp,application/pdf";

/** Shared by the ticket form and the server function that receives it. */
export const ticketSchema = type({
  "+": "delete",
  message: type("string.trim").to(
    type("0 < string <= 5000").configure({
      message: "Cuéntanos qué pasa, en hasta 5000 caracteres.",
    }),
  ),
  priority: type.enumerated(...priorities).configure({ message: "Elige la prioridad del caso." }),
  "issuerId?": "string.uuid",
  "environment?": "'SANDBOX' | 'TEST' | 'LIVE'",
  /** The console path it was sent from, for the team's context. */
  "page?": "string <= 300",
  attachmentIds: type("string.uuid[] <= 5"),
});

export const feedbackSchema = type({
  "+": "delete",
  message: type("string.trim").to(
    type("0 < string <= 2000").configure({
      message: "Escribe tu opinión, en hasta 2000 caracteres.",
    }),
  ),
  "page?": "string <= 300",
});

export const attachmentSchema = type({
  fileName: "0 < string <= 200",
  contentBase64: "string > 0",
});
