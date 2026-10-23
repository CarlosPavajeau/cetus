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
});

/** Server-only environment, validated once at startup. */
export const env = schema.assert(process.env);
