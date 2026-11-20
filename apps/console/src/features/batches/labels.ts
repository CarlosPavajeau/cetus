import type { BadgeStatus } from "~/components/ui/badge";
import type { BatchCounts, BatchStatus, BatchView } from "~/lib/api/types";

export const statusesOpen: readonly BatchStatus[] = ["RECEIVED", "EXPANDING", "PROCESSING"];

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

export function countFinished(counts: BatchCounts) {
  return counts.accepted + counts.rejected + counts.failed;
}

export function progressOf(batch: Pick<BatchView, "items" | "counts" | "status">) {
  // A closed batch never creates the invoices it stopped before, so they do not hold its bar below 100 %.
  const expected = statusesOpen.includes(batch.status)
    ? batch.items
    : batch.items - batch.counts.notCreated;
  return expected === 0 ? 0 : Math.round((countFinished(batch.counts) / expected) * 100);
}
