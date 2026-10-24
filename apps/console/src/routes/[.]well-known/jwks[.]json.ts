import { createFileRoute } from "@tanstack/react-router";

import { auth } from "~/lib/auth/server";

// Outside Better Auth's handler: the API reads it over Railway's private network, without CF-Connecting-IP,
// and the handler's rate limiter would warn that it found no client IP. The keys are public.
export const Route = createFileRoute("/.well-known/jwks.json")({
  server: {
    handlers: {
      GET: async () => Response.json(await auth.api.getJwks()),
    },
  },
});
