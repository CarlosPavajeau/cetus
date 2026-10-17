import "@tanstack/react-start/server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url(),
  CETUS_API_URL: z.string().url(),
});

/** Server-only environment, validated once at startup. */
export const env = schema.parse(process.env);
