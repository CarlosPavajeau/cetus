import type { Issuer, IssuerDetail, TestSetProgress } from "~/lib/api/types";

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

export const documentTypeLabel: Record<
  TestSetProgress["documents"][number]["documentType"],
  string
> = {
  INVOICE: "Facturas",
  CREDIT_NOTE: "Notas crédito",
  DEBIT_NOTE: "Notas débito",
};

/** The name the issuer goes by: its trade name, or its legal name when it has none. */
export function issuerName(issuer: Pick<Issuer, "legalName" | "tradeName">) {
  return issuer.tradeName ?? issuer.legalName;
}
