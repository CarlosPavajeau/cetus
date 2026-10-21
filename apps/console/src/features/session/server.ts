import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { platformRole } from "~/lib/auth/permissions";
import { auth } from "~/lib/auth/server";

/** Current session (user + active organization) or null. Used by route guards. */
export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = new Headers(getRequestHeaders() as HeadersInit);
  const session = await auth.api.getSession({ headers });
  if (!session) {
    return null;
  }
  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      platformRole: platformRole(session.user.role),
      twoFactorEnabled: Boolean(session.user.twoFactorEnabled),
    },
    activeOrganizationId: session.session.activeOrganizationId ?? null,
    impersonatedBy: session.session.impersonatedBy ?? null,
    expiresAt: new Date(session.session.expiresAt).toISOString(),
  };
});
