import { dateFormat } from "~/features/api-keys/formats";
import type { Delivery, DocumentEvent, DocumentStatus, DocumentType } from "~/lib/api/types";

export const documentTypeLabel: Record<DocumentType, string> = {
  INVOICE: "Factura",
  CREDIT_NOTE: "Nota crédito",
  DEBIT_NOTE: "Nota débito",
};

export const documentStatusLabel: Record<DocumentStatus, string> = {
  RECEIVED: "Recibido",
  PROCESSING: "Procesando",
  SUBMITTED: "Enviado a la DIAN",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
  FAILED: "Fallido",
};

export const documentStatusLead: Record<DocumentStatus, string> = {
  RECEIVED: "Cetus lo recibió y lo va a firmar y enviar a la DIAN.",
  PROCESSING: "Cetus lo está firmando y enviando a la DIAN.",
  SUBMITTED: "La DIAN lo recibió y está validándolo.",
  ACCEPTED: "La DIAN lo validó: tiene validez fiscal.",
  REJECTED: "La DIAN lo rechazó: no tiene validez fiscal. Corrige los datos y emite uno nuevo.",
  FAILED: "Cetus no pudo enviarlo a la DIAN después de varios intentos.",
};

/** Credit note concepts (table 13.2.4 of the annex) and debit note concepts (table 13.2.5). */
export const conceptLabel: Record<string, string> = {
  PARTIAL_RETURN: "Devolución parcial",
  CANCELLATION: "Anulación",
  REBATE: "Rebaja o descuento parcial o total",
  PRICE_ADJUSTMENT: "Ajuste de precio",
  EARLY_PAYMENT_DISCOUNT: "Descuento comercial por pronto pago",
  VOLUME_DISCOUNT: "Descuento comercial por volumen de ventas",
  INTEREST: "Intereses",
  EXPENSES: "Gastos por cobrar",
  VALUE_CHANGE: "Cambio del valor",
  OTHER: "Otros",
};

export const deliveryStatusLabel: Record<Delivery["status"], string> = {
  PENDING: "Pendiente",
  SENT: "Enviado",
  DELIVERED: "Entregado",
  BOUNCED: "Rebotado",
  COMPLAINED: "Marcado como spam",
  SKIPPED: "Sin enviar",
  FAILED: "Fallido",
};

export const identificationTypeLabel: Record<string, string> = {
  CIVIL_REGISTRY: "RC",
  IDENTITY_CARD: "TI",
  CITIZEN_ID: "CC",
  FOREIGNER_CARD: "TE",
  FOREIGNER_ID: "CE",
  NIT: "NIT",
  PASSPORT: "Pasaporte",
  FOREIGN_DOCUMENT: "Documento extranjero",
  PEP: "PEP",
  FOREIGN_NIT: "NIT de otro país",
  NUIP: "NUIP",
};

const submissionStatusLabel: Record<string, string> = {
  VALID: "válido",
  INVALID: "no válido",
  PENDING: "recibido, en validación",
  TIMED_OUT: "sin respuesta a tiempo",
  NO_ANSWER: "sin respuesta",
};

/** Title and detail of a timeline event. */
export function describeEvent(event: DocumentEvent): { title: string; detail: string | null } {
  switch (event.kind) {
    case "CREATED":
      return { title: "Recibido por Cetus", detail: null };
    case "DIAN_SUBMISSION":
      return {
        title: `Envío a la DIAN · ${submissionStatusLabel[event.status ?? ""] ?? event.status ?? ""}`,
        detail: [
          event.operation,
          event.code && `código ${event.code}`,
          event.message,
          event.durationMs != null && `${event.durationMs} ms`,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    case "VALIDATED":
      return {
        title: event.status === "ACCEPTED" ? "Aceptado por la DIAN" : "Rechazado por la DIAN",
        detail: event.message,
      };
    case "PROCESSING_FAILED":
      return { title: "Cetus dejó de intentar enviarlo", detail: event.message };
    case "DELIVERY_SENT":
      return { title: "Correo enviado al cliente", detail: event.message };
    case "DELIVERY_UPDATED":
      return {
        title: `Correo ${deliveryStatusLabel[event.status as Delivery["status"]]?.toLowerCase() ?? event.status}`,
        detail: event.message,
      };
    case "WEBHOOK_EVENT":
      return { title: "Webhook publicado", detail: event.message };
  }
}

/** A LocalDate ("2026-10-18") read as a calendar day, not as midnight UTC. */
export function formatDay(day: string) {
  return dateFormat.format(new Date(`${day}T12:00:00-05:00`));
}

export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency }).format(amount);
}
