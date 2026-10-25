import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { userPendingConsents } from "~/features/legal/consents";
import { platformRole } from "~/lib/auth/permissions";
import { auth, memberRoles } from "~/lib/auth/server";

/** Current session (user + active organization) or null. Used by route guards. */
export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = new Headers(getRequestHeaders());
  const session = await auth.api.getSession({ headers });
  if (!session) {
    return null;
  }
  const organizationId = session.session.activeOrganizationId ?? null;
  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
      platformRole: platformRole(session.user.role),
      twoFactorEnabled: Boolean(session.user.twoFactorEnabled),
    },
    activeOrganizationId: organizationId,
    // Read on every navigation, like the API's token: a role change shows on the next page.
    memberRoles: organizationId ? await memberRoles(session.user.id, organizationId) : [],
    impersonatedBy: session.session.impersonatedBy ?? null,
    // Documents whose current version the person has not accepted; the console asks before going on.
    pendingConsents: await userPendingConsents(session.user.id),
    expiresAt: new Date(session.session.expiresAt).toISOString(),
  };
});
