import type { AccountStatus } from "./schema";

export const accountStatusLabel: Record<AccountStatus, string> = {
  ACTIVE: "Activa",
  SUSPENDED: "Suspendida",
};

export const memberRoleLabel: Record<string, string> = {
  owner: "Dueño",
  admin: "Administrador",
  biller: "Facturador",
  member: "Miembro",
};
