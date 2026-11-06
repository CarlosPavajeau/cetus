import type { QueryClient } from "@tanstack/react-query";

/**
 * Last steps of a sign-in, after the password (and the second factor, if any) were accepted. The session
 * already starts in the person's last organization (see the session hook in `lib/auth/server.ts`).
 */
export function startSession(queryClient: QueryClient) {
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
