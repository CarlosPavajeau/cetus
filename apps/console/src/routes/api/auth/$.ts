import { createFileRoute } from "@tanstack/react-router";
import { auth } from "~/lib/auth/server";

// Better Auth endpoints: sign-in, sign-up, organizations, /api/auth/jwks (used by Quarkus), /api/auth/token...
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
