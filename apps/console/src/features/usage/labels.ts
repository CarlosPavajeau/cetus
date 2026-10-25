import type { Plan } from "~/lib/api/types";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const count = new Intl.NumberFormat("es-CO");

export function formatCop(amount: number) {
  return cop.format(amount);
}

export function formatCount(value: number) {
  return count.format(value);
}

/** "Plan Inicial", or "Sin plan" for an account the Cetus team has not assigned one yet. */
export function planTitle(plan: Plan) {
  return plan.code === "FREE" ? plan.name : `Plan ${plan.name}`;
}

export function planPrice(plan: Plan) {
  return plan.priceMonthlyCop === null
    ? "Precio a convenir"
    : `${formatCop(plan.priceMonthlyCop)} al mes`;
}

export function planDocuments(plan: Plan) {
  return plan.documentsIncluded === null
    ? "Sin límite de documentos"
    : `${formatCount(plan.documentsIncluded)} documentos al mes`;
}

export function planIssuers(plan: Plan) {
  if (plan.issuersIncluded === null) {
    return "Emisores sin límite";
  }
  return plan.issuersIncluded === 1 ? "1 emisor" : `${plan.issuersIncluded} emisores`;
}

export function planOverage(plan: Plan) {
  return plan.priceOverageCop === null
    ? null
    : `${formatCop(plan.priceOverageCop)} por documento adicional`;
}

/** "Octubre de 2026" for a YYYY-MM period, read in Colombia like the period itself. */
export function periodLabel(period: string) {
  const label = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${period}-01T00:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
