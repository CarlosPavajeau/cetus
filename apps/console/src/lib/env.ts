import "@tanstack/react-start/server-only";
import { type } from "arktype";

const schema = type({
  "+": "delete",
  DATABASE_URL: "string.url",
  BETTER_AUTH_SECRET: "string >= 16",
  BETTER_AUTH_URL: "string.url",
  CETUS_API_URL: "string.url",
  // Read by the edge middleware (start.ts); listed so a short secret fails at startup.
  "CETUS_EDGE_SECRET?": "string >= 32",
  // Resend for the account emails (invitations); a send-only key, apart from the worker's.
  "RESEND_API_KEY?": "string > 0",
  // e.g. "Cetus <cuentas@cetus.cantte.com>", on a domain verified in Resend.
  "CETUS_AUTH_EMAIL_FROM?": "string > 0",
  // Development and CI without Resend: account emails go to JSON files here, for the end-to-end tests.
  "CETUS_EMAIL_OUTBOX_DIR?": "string > 0",
});

/** Server-only environment, validated once at startup. */
export const env = schema.assert(process.env);
