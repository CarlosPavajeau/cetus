import type { AuditAction, AuditEntry } from "~/lib/api/types";

export const actionLabel: Record<AuditAction, string> = {
  ACCOUNT_CREATED: "Cuenta creada",
  API_KEY_CREATED: "Llave de API creada",
  API_KEY_REVOKED: "Llave de API revocada",
  ISSUER_CREATED: "Emisor creado",
  ISSUER_UPDATED: "Emisor actualizado",
  SOFTWARE_CREDENTIALS_SET: "Software DIAN configurado",
  CERTIFICATE_UPLOADED: "Certificado cargado",
  NUMBERING_RANGE_ADDED: "Rango de numeración agregado",
  ISSUER_STATUS_CHANGED: "Estado del emisor cambiado",
  ISSUER_PROMOTED: "Emisor pasado a producción",
  WEBHOOK_ENDPOINT_CREATED: "Webhook registrado",
  WEBHOOK_ENDPOINT_DISABLED: "Webhook desactivado",
  WEBHOOK_ENDPOINT_ENABLED: "Webhook reactivado",
  WEBHOOK_DELIVERY_RETRIED: "Webhook reenviado",
};

export const actorTypeLabel: Record<AuditEntry["actorType"], string> = {
  USER: "Usuario",
  API_KEY: "Llave de API",
  SYSTEM: "Sistema",
};

// A fixed zone keeps server and browser renders identical and matches the "Horarios de Colombia" notes.
const timeZone = "America/Bogota";
export const dayFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone });
export const timeFormat = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZone,
});
