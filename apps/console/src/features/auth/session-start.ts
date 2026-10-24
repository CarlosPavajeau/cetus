import type { QueryClient } from "@tanstack/react-query";

import { authClient } from "~/lib/auth/client";

/** Last steps of a sign-in, after the password (and the second factor, if any) were accepted. */
export async function startSession(queryClient: QueryClient) {
  // Make sure there is an active organization: the API scopes everything by it.
  const { data: organizations } = await authClient.organization.list();
  const first = organizations?.[0];
  if (first) {
    await authClient.organization.setActive({ organizationId: first.id });
  }
  // Drop anything cached by a previous session in this tab (e.g. one that expired).
  queryClient.clear();
}

/**
 * The search of the sign-in steps: the invitation the person came to accept, kept through every step (the
 * password, then the second factor) so they land back on it.
 */
export function invitationSearch(search: Record<string, unknown>): { invitation?: string } {
  return typeof search.invitation === "string" && search.invitation
    ? { invitation: search.invitation }
    : {};
}
