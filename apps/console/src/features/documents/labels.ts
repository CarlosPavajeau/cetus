import { dateFormat } from "~/features/api-keys/formats";
import type {
  Delivery,
  DocumentEvent,
  DocumentStatus,
  DocumentType,
  Environment,
} from "~/lib/api/types";
import { unknownValue, entryOf } from "~/lib/utils";

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

const sandboxStatusLead: Record<DocumentStatus, string> = {
  RECEIVED: "Cetus lo recibió y lo va a firmar y enviar al simulador.",
  PROCESSING: "Cetus lo está firmando y enviando al simulador.",
  SUBMITTED: "El simulador lo recibió y está validándolo.",
  ACCEPTED: "El simulador de Cetus lo aceptó, como lo haría la DIAN. No tiene validez fiscal.",
  REJECTED: "El simulador lo rechazó, como lo haría la DIAN. Corrige los datos y emite uno nuevo.",
  FAILED: "Cetus no pudo enviarlo al simulador después de varios intentos.",
};

/** The lead of a document's status; outside production nothing has fiscal validity. */
export function documentLead(status: DocumentStatus, environment: Environment) {
  if (environment === "SANDBOX") {
    return sandboxStatusLead[status];
  }
  if (environment === "TEST" && status === "ACCEPTED") {
    return "La DIAN de pruebas lo validó. No tiene validez fiscal.";
  }
  return documentStatusLead[status];
}

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

/** Events about how Cetus talks to the DIAN and to webhooks, rather than about the document itself. */
export function isTechnicalEvent(event: DocumentEvent) {
  return event.kind === "DIAN_SUBMISSION" || event.kind === "WEBHOOK_EVENT";
}

/** Title and detail of a timeline event; in SANDBOX the simulator answers instead of the DIAN. */
export function describeEvent(
  event: DocumentEvent,
  environment: Environment,
): { title: string; detail: string | null } {
  const sandbox = environment === "SANDBOX";
  switch (event.kind) {
    case "CREATED":
      return { title: "Recibido por Cetus", detail: null };
    case "DIAN_SUBMISSION":
      return {
        title: `${sandbox ? "Envío al simulador" : "Envío a la DIAN"} · ${submissionStatusLabel[event.status ?? ""] ?? event.status ?? ""}`,
        detail: [
          event.operation,
          event.code && `código ${event.code}`,
          event.message,
          event.durationMs != null && `${event.durationMs} ms`,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    case "VALIDATED": {
      const validator = sandbox ? "el simulador" : "la DIAN";
      return {
        title:
          event.status === "ACCEPTED" ? `Aceptado por ${validator}` : `Rechazado por ${validator}`,
        detail: event.message,
      };
    }
    case "PROCESSING_FAILED":
      return { title: "Cetus dejó de intentar enviarlo", detail: event.message };
    case "DELIVERY_SENT":
      return {
        title: sandbox ? "Correo enviado al contacto técnico" : "Correo enviado al cliente",
        detail: event.message,
      };
    case "DELIVERY_UPDATED":
      return {
        title: `Correo ${(event.status && entryOf(deliveryStatusLabel, event.status)?.toLowerCase()) ?? event.status}`,
        detail: event.message && describeDeliveryError(event.message),
      };
    case "WEBHOOK_EVENT":
      return { title: "Webhook publicado", detail: event.message };
    default:
      return { title: unknownValue(event.kind), detail: event.message };
  }
}

const deliveryErrorLabel: Record<string, string> = {
  "Email delivery is not configured": "El envío de correos no está activo en este ambiente.",
  "SANDBOX documents go to the account's technical contact, which has no verified address":
    "En sandbox el correo va al contacto técnico de la cuenta, y no tiene un correo verificado.",
  "SANDBOX documents are never emailed to their customer":
    "En sandbox el correo nunca va al cliente.",
  "The customer has no email address": "El cliente no tiene correo.",
  "TEST documents are only emailed to CETUS_EMAIL_TEST_RECIPIENT, which is not set":
    "En pruebas el correo solo va a una dirección de prueba, y no hay una configurada.",
  "The document is not accepted": "El documento no está aceptado.",
};

const megabyteFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

/**
 * A delivery error in Spanish. The worker records them in English, and the email provider's own reasons stay
 * as they come.
 */
export function describeDeliveryError(error: string) {
  const known = entryOf(deliveryErrorLabel, error);
  if (known) {
    return known;
  }
  const quota = /^The account already received its (\d+) SANDBOX emails of the day$/.exec(error);
  if (quota) {
    return `La cuenta ya recibió hoy sus ${quota[1]} correos de sandbox. Mañana puede recibir más.`;
  }
  const size = /^The zip weighs (\d+) bytes; the annex allows 2 MB per email$/.exec(error);
  if (size) {
    const megabytes = megabyteFormat.format(Number(size[1]) / 1_000_000);
    return `El PDF y el AttachedDocument pesan ${megabytes} MB comprimidos; la DIAN permite 2 MB por correo.`;
  }
  const attempts = /^Gave up after (\d+) attempts: /.exec(error);
  if (attempts) {
    return `Cetus dejó de intentarlo después de ${attempts[1]} intentos.`;
  }
  return error;
}

/** A LocalDate ("2026-10-18") read as a calendar day, not as midnight UTC. */
export function formatDay(day: string) {
  return dateFormat.format(new Date(`${day}T12:00:00-05:00`));
}

export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency }).format(amount);
}
