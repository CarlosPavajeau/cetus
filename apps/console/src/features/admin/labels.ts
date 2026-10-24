import type { AccountStatus } from "./schema";

export const accountStatusLabel: Record<AccountStatus, string> = {
  ACTIVE: "Activa",
  SUSPENDED: "Suspendida",
  CLOSED: "Cerrada",
};

export const memberRoleLabel: Record<string, string> = {
  owner: "Dueño",
  admin: "Administrador",
  biller: "Facturador",
  member: "Miembro",
};
