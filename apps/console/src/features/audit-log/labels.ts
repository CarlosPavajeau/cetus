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
  TECHNICAL_KEY_REQUESTED_FROM_DIAN: "Clave técnica pedida a la DIAN",
  ISSUER_STATUS_CHANGED: "Estado del emisor cambiado",
  ISSUER_PROMOTED: "Emisor pasado a producción",
  WEBHOOK_ENDPOINT_CREATED: "Webhook registrado",
  WEBHOOK_ENDPOINT_DISABLED: "Webhook desactivado",
  WEBHOOK_ENDPOINT_ENABLED: "Webhook reactivado",
  WEBHOOK_DELIVERY_RETRIED: "Webhook reenviado",
  INVOICE_ISSUED: "Factura emitida",
  CREDIT_NOTE_ISSUED: "Nota crédito emitida",
  DEBIT_NOTE_ISSUED: "Nota débito emitida",
  DOCUMENT_RESENT: "Documento reenviado por correo",
  ACCOUNT_SUSPENDED: "Cuenta suspendida",
  ACCOUNT_REACTIVATED: "Cuenta reactivada",
  ACCOUNT_PLAN_CHANGED: "Plan cambiado",
  USER_BANNED: "Usuario bloqueado",
  USER_UNBANNED: "Usuario desbloqueado",
  IMPERSONATION_STARTED: "Soporte entró como usuario",
  IMPERSONATION_ENDED: "Soporte salió de la sesión",
  CERTIFICATE_UPLOAD_LINK_CREATED: "Enlace de carga de certificado enviado",
  CONTACT_CHANGE_REQUESTED: "Cambio de contacto solicitado",
  CONTACT_CHANGE_CANCELED: "Cambio de contacto cancelado",
  CONTACT_VERIFIED: "Contacto verificado",
  SUPPORT_TICKET_CREATED: "Caso de soporte abierto",
  SUPPORT_TICKET_STATUS_CHANGED: "Estado del caso de soporte cambiado",
  PLAN_CREATED: "Plan puesto a la venta",
  PLAN_VERSION_ADDED: "Versión de plan agregada",
  BILLING_PROFILE_UPDATED: "Perfil de facturación actualizado",
  BILLING_ORDER_CREATED: "Orden de compra creada",
  BILLING_ORDER_PAID: "Orden de compra pagada",
  CREDITS_GRANTED: "Créditos otorgados",
  CREDITS_ADJUSTED: "Créditos ajustados",
  DOCUMENT_CREDIT_RELEASED: "Crédito de documento liberado",
  SUBSCRIPTION_STARTED: "Suscripción iniciada",
  SUBSCRIPTION_OVERAGE_LIMIT_CHANGED: "Límite de excedente cambiado",
  SUBSCRIPTION_PLAN_SCHEDULED: "Cambio de plan programado",
  SUBSCRIPTION_CANCEL_SCHEDULED: "Cancelación programada",
  SUBSCRIPTION_CANCEL_UNDONE: "Cancelación deshecha",
  SUBSCRIPTION_CANCELED: "Suscripción terminada",
};

export const actorTypeLabel: Record<AuditEntry["actorType"], string> = {
  USER: "Usuario",
  API_KEY: "Llave de API",
  PLATFORM: "Equipo Cetus",
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
