import "@tanstack/react-start/server-only";
import { type } from "arktype";

const schema = type({
  "+": "delete",
  DATABASE_URL: "string.url",
  BETTER_AUTH_SECRET: "string >= 16",
  BETTER_AUTH_URL: "string.url",
  CETUS_API_URL: "string.url",
});

/** Server-only environment, validated once at startup. */
export const env = schema.assert(process.env);
