import { formatCop, formatCount } from "~/features/usage/labels";
import type {
  CreditLot,
  CreditMovement,
  OrderStatus,
  PlanKind,
  PlanOffer,
  PlanVersion,
} from "~/lib/api/types";

/** The API's amounts are in cents of COP. */
export function formatCents(cents: number) {
  return formatCop(cents / 100);
}

export const planKindLabel: Record<PlanKind, string> = {
  SUBSCRIPTION: "Suscripción",
  PACKAGE: "Paquete anual",
  TOPUP: "Recarga",
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: "Pendiente de pago",
  PAID: "Pagada",
  FAILED: "Pago rechazado",
  EXPIRED: "Vencida",
  REFUNDED: "Reembolsada",
};

export const lotStatusLabel: Record<CreditLot["status"], string> = {
  ACTIVE: "Vigente",
  EXHAUSTED: "Agotado",
  EXPIRED: "Vencido",
  REVOKED: "Revocado",
};

export const lotSourceLabel: Record<CreditLot["sourceType"], string> = {
  ORDER_ITEM: "Compra",
  SUBSCRIPTION_PERIOD: "Suscripción",
  PROMO: "Cortesía",
  ADJUSTMENT: "Ajuste",
};

export const movementTypeLabel: Record<CreditMovement["type"], string> = {
  GRANT: "Créditos otorgados",
  RESERVE: "Reservado por un documento",
  CONFIRM: "Documento aceptado por la DIAN",
  RELEASE: "Devuelto: el documento no se emitió",
  EXPIRE: "Vencidos",
  SETTLE: "Margen de cortesía saldado",
  BILL_OVERAGE: "Excedente facturado",
  ADJUST: "Ajuste",
  REVOKE: "Revocados",
};

/** "Paquete Negocio" for a lot of a product, the source otherwise. */
export function lotTitle(lot: CreditLot) {
  return lot.planName ?? lotSourceLabel[lot.sourceType];
}

export function documentsLabel(documents: number) {
  return documents === 1 ? "1 documento" : `${formatCount(documents)} documentos`;
}

export function issuersLabel(issuers: number) {
  return issuers === 1
    ? "1 emisor en producción"
    : `${formatCount(issuers)} emisores en producción`;
}

export function validityLabel(months: number) {
  return months === 12 ? "Vigencia de 12 meses" : `Vigencia de ${formatCount(months)} meses`;
}

/** The price as charged, and how it splits when it carries a tax. */
export function priceBreakdown(version: PlanVersion) {
  return version.taxCents === 0
    ? "Precio final, sin IVA"
    : `Base ${formatCents(version.baseCents)} + IVA ${formatCents(version.taxCents)}`;
}

/** Only packages and top-ups are sold from the console; a top-up needs a package in force. */
export function purchasable(
  offer: PlanOffer,
  product: boolean,
): offer is PlanOffer & {
  version: PlanVersion;
} {
  if (offer.version === null || offer.version.totalCents === 0) {
    return false;
  }
  return offer.kind === "PACKAGE" || (offer.kind === "TOPUP" && product);
}
