import type { IncidentImpact, StatusComponent } from "~/lib/api/types";

export const componentLabel: Record<StatusComponent, string> = {
  API: "API",
  PROCESSING: "Procesamiento de documentos",
  DIAN_LIVE: "DIAN · producción",
  DIAN_TEST: "DIAN · habilitación",
};

export const impactLabel: Record<IncidentImpact, string> = {
  DEGRADED: "Degradado",
  OUTAGE: "Caída",
};
