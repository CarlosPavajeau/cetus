import { useImpersonation } from "~/features/session/useImpersonation";
import { useMemberPermissions } from "~/features/session/useMemberPermissions";
import type { Environment } from "~/lib/api/types";

/**
 * Why the person cannot issue in this environment, or null. Only LIVE is restricted: to owners, admins and
 * billers, and never while a Cetus admin impersonates them. The API enforces the same rules.
 */
export function useBlockedReason(environment: Environment): string | null {
  const { issueLive } = useMemberPermissions();
  const impersonating = Boolean(useImpersonation());
  if (environment !== "LIVE") {
    return null;
  }
  if (impersonating) {
    return "Los documentos de producción solo los emite la persona de la cuenta, no el equipo de soporte.";
  }
  return issueLive
    ? null
    : "Solo los dueños, administradores y facturadores de la organización pueden emitir documentos en producción.";
}
