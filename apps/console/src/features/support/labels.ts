import type { SupportTicketPriority, SupportTicketStatus } from "~/lib/api/types";

export const priorityLabel: Record<SupportTicketPriority, string> = {
  CRITICAL: "Crítica",
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
};

export const statusLabel: Record<SupportTicketStatus, string> = {
  OPEN: "Abierto",
  IN_PROGRESS: "En curso",
  RESOLVED: "Resuelto",
};
