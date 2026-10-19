import type { WebhookDelivery, WebhookEndpoint } from "~/lib/api/types";

export const endpointStatusLabel: Record<WebhookEndpoint["status"], string> = {
  ACTIVE: "Activo",
  DISABLED: "Desactivado",
};

export const deliveryStatusLabel: Record<WebhookDelivery["status"], string> = {
  PENDING: "Pendiente",
  SUCCEEDED: "Entregado",
  FAILED: "Fallido",
  CANCELED: "Cancelado",
};

const eventTypeLabels: Record<string, string> = {
  "invoice.accepted": "Factura aceptada",
  "invoice.rejected": "Factura rechazada",
  "invoice.failed": "Factura fallida",
  "credit_note.accepted": "Nota crédito aceptada",
  "credit_note.rejected": "Nota crédito rechazada",
  "credit_note.failed": "Nota crédito fallida",
  "debit_note.accepted": "Nota débito aceptada",
  "debit_note.rejected": "Nota débito rechazada",
  "debit_note.failed": "Nota débito fallida",
  "document.delivered": "Documento entregado al cliente",
  "document.delivery_failed": "Entrega al cliente fallida",
};

export function eventTypeLabel(type: string) {
  return eventTypeLabels[type] ?? type;
}

/** "Todos los eventos", or the subscribed ones. */
export function eventTypesSummary(eventTypes: string[]) {
  if (eventTypes.length === 0) {
    return "Todos los eventos";
  }
  return eventTypes.length === 1 ? eventTypeLabel(eventTypes[0]!) : `${eventTypes.length} eventos`;
}
