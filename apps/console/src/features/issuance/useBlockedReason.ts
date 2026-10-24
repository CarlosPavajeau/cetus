import { useSuspenseQuery } from "@tanstack/react-query";

import { useImpersonation } from "~/features/session/useImpersonation";
import type { Environment } from "~/lib/api/types";

import { canIssueLiveQuery } from "./queries";

/**
 * Why the person cannot issue in this environment, or null. Only LIVE is restricted: to owners and admins,
 * and never while a Cetus admin impersonates them. The API enforces the same rules.
 */
export function useBlockedReason(environment: Environment): string | null {
  const { data: canIssueLive } = useSuspenseQuery(canIssueLiveQuery);
  const impersonating = Boolean(useImpersonation());
  if (environment !== "LIVE") {
    return null;
  }
  if (impersonating) {
    return "Los documentos de producción solo los emite la persona de la cuenta, no el equipo de soporte.";
  }
  return canIssueLive
    ? null
    : "Solo los dueños y administradores de la organización pueden emitir documentos en producción.";
}
