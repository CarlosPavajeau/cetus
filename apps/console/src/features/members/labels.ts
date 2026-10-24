import type { AssignableMemberRole } from "~/lib/auth/permissions";

export const assignableRoleItems: {
  value: AssignableMemberRole;
  label: string;
  description: string;
}[] = [
  {
    value: "admin",
    label: "Administrador",
    description: "Todo, incluidos emisores, llaves, webhooks, contactos y miembros.",
  },
  {
    value: "biller",
    label: "Facturador",
    description: "Emite en producción y usa el catálogo; consulta lo demás.",
  },
  {
    value: "member",
    label: "Miembro",
    description: "Consulta y emite en pruebas y simulación.",
  },
];
