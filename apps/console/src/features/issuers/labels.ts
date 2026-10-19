import type { Issuer, IssuerDetail } from "~/lib/api/types";

export const statusLabel: Record<Issuer["status"], string> = {
  ONBOARDING: "Configuración pendiente",
  TESTING: "En habilitación",
  ENABLED: "Habilitado",
  DISABLED: "Deshabilitado",
};

export const personTypeLabel: Record<IssuerDetail["personType"], string> = {
  LEGAL_ENTITY: "Persona jurídica",
  NATURAL_PERSON: "Persona natural",
};

/** The name the issuer goes by: its trade name, or its legal name when it has none. */
export function issuerName(issuer: Pick<Issuer, "legalName" | "tradeName">) {
  return issuer.tradeName ?? issuer.legalName;
}
