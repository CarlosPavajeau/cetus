import "@tanstack/react-start/server-only";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { api } from "~/lib/api/client";
import { auth } from "~/lib/auth/server";

/**
 * Someone left the organization: the batches they sent stop emailing them when they finish. The API acts on the
 * session's active organization, so a removal from any other one is only logged.
 */
export async function forgetBatchSender(organizationId: string, userId: string) {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (session?.session.activeOrganizationId !== organizationId) {
    console.error(
      `Could not stop the batch emails of user ${userId}: organization ${organizationId} is not the active one`,
    );
    return;
  }
  await api.delete("/console/document-batches/senders/{userId}", {
    params: { path: { userId } },
  });
}
