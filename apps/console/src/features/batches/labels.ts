import type { BadgeStatus } from "~/components/ui/badge";
import type { BatchCounts, BatchStatus, BatchView } from "~/lib/api/types";

export const batchStatusLabel: Record<BatchStatus, string> = {
  RECEIVED: "En espera",
  EXPANDING: "Creando facturas",
  PROCESSING: "Procesando",
  COMPLETED: "Terminado",
  PARTIAL: "Incompleto",
  FAILED: "Fallido",
};

export const batchBadgeStatus: Record<BatchStatus, BadgeStatus> = {
  RECEIVED: "idle",
  EXPANDING: "pending",
  PROCESSING: "pending",
  COMPLETED: "success",
  PARTIAL: "warning",
  FAILED: "error",
};

/** Why a batch stopped creating invoices, in the person's words; the API's code otherwise. */
const stopReasons: Record<string, string> = {
  insufficient_credits: "Se acabaron los créditos de la cuenta.",
  overage_limit_reached: "La suscripción llegó a su límite de excedente.",
  no_active_product: "La cuenta no tiene una suscripción ni un paquete vigente.",
  no_active_numbering_range: "El emisor se quedó sin un rango de numeración vigente.",
  technical_key_pending: "El rango de numeración espera su clave técnica de la DIAN.",
  issuer_not_ready: "El emisor dejó de estar habilitado para emitir.",
  expansion_failed: "Una falla repetida al crear las facturas.",
};

export function stopReasonText(reason: string) {
  return stopReasons[reason] ?? `Se detuvo (${reason}).`;
}

/** Documents that reached a final status, out of the batch's items. */
export function finished(counts: BatchCounts) {
  return counts.accepted + counts.rejected + counts.failed;
}

export function progressOf(batch: Pick<BatchView, "items" | "counts">) {
  return batch.items === 0 ? 0 : Math.round((finished(batch.counts) / batch.items) * 100);
}
