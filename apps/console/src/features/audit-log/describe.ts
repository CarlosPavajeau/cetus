import { formatCents } from "~/features/billing/labels";
import { conceptLabel } from "~/features/documents/labels";
import { priorityLabel, statusLabel } from "~/features/support/labels";
import type { AuditEntry } from "~/lib/api/types";
import { unknownValue } from "~/lib/utils";

import { dayFormat, timeFormat } from "./labels";

const issuerStatusLabel: Record<string, string> = {
  ONBOARDING: "Configuración pendiente",
  TESTING: "En habilitación",
  ENABLED: "Habilitado",
  DISABLED: "Deshabilitado",
};

const environmentLabel: Record<string, string> = {
  TEST: "Pruebas",
  LIVE: "Producción",
  SANDBOX: "Simulación",
};

const documentTypeLabel: Record<string, string> = {
  INVOICE: "Factura",
  CREDIT_NOTE: "Nota crédito",
  DEBIT_NOTE: "Nota débito",
};

const contactCategoryLabel: Record<string, string> = {
  TECHNICAL: "Técnico",
  FISCAL: "Fiscal",
  BILLING: "Facturación",
};

const personTypeLabel: Record<string, string> = {
  LEGAL_ENTITY: "Persona jurídica",
  NATURAL_PERSON: "Persona natural",
};

const issuerFieldLabel: Record<string, string> = {
  legalName: "razón social",
  tradeName: "nombre comercial",
  personType: "tipo de persona",
  taxLevelCodes: "responsabilidades tributarias",
  responsibleForIva: "responsabilidad de IVA",
  address: "dirección",
  email: "correo",
  phone: "teléfono",
};

function text(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** An amount in cents of COP, as the subscription records keep it. */
function cents(value: unknown): string {
  return typeof value === "number" ? formatCents(value) : text(value);
}

function label(labels: Record<string, string>, value: unknown): string {
  return labels[text(value)] ?? text(value);
}

/** One line about what an audited action changed, from its metadata. */
export function describeEntry(entry: Pick<AuditEntry, "action" | "data">): string {
  const data = entry.data;
  switch (entry.action) {
    case "ACCOUNT_CREATED":
      return text(data.name);
    case "API_KEY_CREATED":
    case "API_KEY_REVOKED":
      return `${text(data.name)} · ${text(data.prefix)}… · ${label(environmentLabel, data.environment)}`;
    case "ISSUER_CREATED":
      return `NIT ${text(data.nit)} · ${label(environmentLabel, data.environment)} · ${label(personTypeLabel, data.personType)}${data.promotedFrom ? " · desde la habilitación" : ""}`;
    case "ISSUER_UPDATED":
      return Array.isArray(data.fields)
        ? `Cambió ${data.fields.map((field) => label(issuerFieldLabel, field)).join(", ")}`
        : "";
    case "SOFTWARE_CREDENTIALS_SET":
      return `Software ${text(data.softwareId)}${data.hasTestSet ? " · con set de pruebas" : ""}`;
    case "CERTIFICATE_UPLOADED":
      return data.validTo
        ? `${text(data.subject)} · vence el ${dayFormat.format(new Date(text(data.validTo)))}`
        : text(data.subject);
    case "NUMBERING_RANGE_ADDED":
      return `${label(documentTypeLabel, data.documentType)} ${text(data.prefix)}${text(data.from)} a ${text(data.prefix)}${text(data.to)}`;
    case "TECHNICAL_KEY_REQUESTED_FROM_DIAN":
      return `Rango de factura ${text(data.prefix) || "sin prefijo"}`;
    case "ISSUER_STATUS_CHANGED":
      return `${label(issuerStatusLabel, data.from)} → ${label(issuerStatusLabel, data.to)}`;
    case "ISSUER_PROMOTED":
      return "Se creó su emisor de producción";
    case "WEBHOOK_ENDPOINT_DISABLED":
      return `${text(data.url)} · ${label(environmentLabel, data.environment)}${data.reason === "AUTOMATIC" ? ` · por ${text(data.consecutiveFailures)} fallas seguidas` : ""}`;
    case "WEBHOOK_ENDPOINT_ENABLED":
      return `${text(data.url)} · ${label(environmentLabel, data.environment)}${Number(data.redelivered) > 0 ? ` · ${text(data.redelivered)} eventos reenviados` : ""}`;
    case "WEBHOOK_ENDPOINT_CREATED":
    case "WEBHOOK_DELIVERY_RETRIED":
      return `${text(data.url)} · ${label(environmentLabel, data.environment)}`;
    case "INVOICE_ISSUED":
      return `${text(data.number)} · ${label(environmentLabel, data.environment)}`;
    case "CREDIT_NOTE_ISSUED":
      return data.concept === "CANCELLATION"
        ? `${text(data.number)} anula la factura ${text(data.invoiceNumber)} · ${label(environmentLabel, data.environment)}`
        : `${text(data.number)} sobre la factura ${text(data.invoiceNumber)} · ${label(conceptLabel, data.concept)} · ${label(environmentLabel, data.environment)}`;
    case "DEBIT_NOTE_ISSUED":
      return `${text(data.number)} sobre la factura ${text(data.invoiceNumber)} · ${label(conceptLabel, data.concept)} · ${label(environmentLabel, data.environment)}`;
    case "DOCUMENT_RESENT":
      return `${text(data.number)}${data.recipient ? ` a ${text(data.recipient)}` : ""} · ${label(environmentLabel, data.environment)}`;
    case "ACCOUNT_SUSPENDED":
    case "ACCOUNT_REACTIVATED":
      return `Motivo: ${text(data.reason)}`;
    case "ACCOUNT_PLAN_CHANGED":
      return `De ${text(data.planPrevious)} a ${text(data.plan)} · Motivo: ${text(data.reason)}`;
    case "USER_BANNED":
      return `${text(data.email)} · ${data.expiresAt ? `hasta el ${dayFormat.format(new Date(text(data.expiresAt)))}` : "indefinido"} · Motivo: ${text(data.reason)}`;
    case "USER_UNBANNED":
      return `${text(data.email)} · Motivo: ${text(data.reason)}`;
    case "IMPERSONATION_STARTED":
      return `Como ${text(data.email)} hasta las ${timeFormat.format(new Date(text(data.expiresAt)))} · Motivo: ${text(data.reason)}`;
    case "IMPERSONATION_ENDED":
      return "Terminó de ver la consola como el usuario";
    case "CONTACT_CHANGE_REQUESTED":
      return `${label(contactCategoryLabel, data.category)} · ${data.current ? `${text(data.current)} → ` : ""}${text(data.email)}, pendiente de verificación`;
    case "CONTACT_CHANGE_CANCELED":
      return `${label(contactCategoryLabel, data.category)} · ${text(data.email)}`;
    case "CONTACT_VERIFIED":
      return `${label(contactCategoryLabel, data.category)} · ${data.previous ? `${text(data.previous)} → ` : ""}${text(data.email)}`;
    case "SUPPORT_TICKET_CREATED":
      return `Caso #${text(data.number)} · Prioridad ${label(priorityLabel, data.priority)}`;
    case "SUPPORT_TICKET_STATUS_CHANGED":
      return `Caso #${text(data.number)} · ${label(statusLabel, data.statusPrevious)} → ${label(statusLabel, data.status)}`;
    case "PLAN_CREATED":
      return `${text(data.name)} (${text(data.plan)})${data.validityMonths ? ` · ${text(data.validityMonths)} meses` : ""}`;
    case "PLAN_VERSION_ADDED":
      return `${text(data.plan)} · versión ${text(data.version)} desde el ${dayFormat.format(new Date(text(data.validFrom)))}`;
    case "BILLING_PROFILE_UPDATED":
      return `${text(data.legalName)} · ${text(data.identificationNumber)}`;
    case "BILLING_ORDER_CREATED":
      return `${text(data.plan)} · ${text(data.reference)}`;
    case "BILLING_ORDER_PAID":
      return `${text(data.reference)} · ${text(data.paymentMethodType)}`;
    case "CREDITS_GRANTED":
      return `${text(data.plan)} · ${text(data.quantity)} documentos hasta el ${dayFormat.format(new Date(text(data.expiresAt)))} · Motivo: ${text(data.reason)}`;
    case "CREDITS_ADJUSTED":
      return `${text(data.quantity)} documentos · Motivo: ${text(data.reason)}`;
    case "DOCUMENT_CREDIT_RELEASED":
      return `Motivo: ${text(data.reason)}`;
    case "SUBSCRIPTION_STARTED":
      return `${text(data.plan)} · ${text(data.reference)}`;
    case "SUBSCRIPTION_OVERAGE_LIMIT_CHANGED":
      return `${cents(data.overageLimitCentsPrevious)} → ${cents(data.overageLimitCents)}`;
    case "SUBSCRIPTION_PLAN_SCHEDULED":
      return data.plan === data.planPrevious
        ? `Sigue en ${text(data.plan)}`
        : `${text(data.planPrevious)} → ${text(data.plan)} desde el siguiente periodo`;
    case "SUBSCRIPTION_CANCEL_SCHEDULED":
    case "SUBSCRIPTION_CANCEL_UNDONE":
      return text(data.plan);
    case "PAYMENT_METHOD_SAVED":
    case "PAYMENT_METHOD_REMOVED":
      return text(data.card);
    case "BILLING_ORDER_CHARGE_REQUESTED":
      return `${text(data.reference)} · ${text(data.card)} · ${cents(data.totalCents)}`;
    case "SUBSCRIPTION_CANCELED":
      return `${text(data.plan)} · ${data.reason === "UNPAID" ? "Renovación sin pagar" : "Pedido por la cuenta"}`;
    case "CERTIFICATE_UPLOAD_LINK_CREATED":
      return `Vence el ${dayFormat.format(new Date(text(data.expiresAt)))} a las ${timeFormat.format(new Date(text(data.expiresAt)))}`;
    default:
      return unknownValue(entry.action);
  }
}
