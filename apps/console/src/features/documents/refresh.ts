import type { DocumentDetail, DocumentStatus } from "~/lib/api/types";

const inFlight = new Set<DocumentStatus>(["RECEIVED", "PROCESSING", "SUBMITTED"]);

// The worker queues the email when it records the acceptance, and the delivery appears moments later. An
// older document without one (validated before deliveries existed) never gets it, so the wait is bounded.
const deliveryStartMs = 10 * 60 * 1000;

export function awaitingDelivery(document: Pick<DocumentDetail, "status" | "deliveries" | "dian">) {
  const validatedAt = document.dian.validatedAt;
  return (
    document.status === "ACCEPTED" &&
    document.deliveries.length === 0 &&
    validatedAt !== null &&
    Date.now() - Date.parse(validatedAt) < deliveryStartMs
  );
}

/** Whether the detail page still waits for something: the DIAN's answer or the email to the customer. */
export function refreshing(document: Pick<DocumentDetail, "status" | "deliveries" | "dian">) {
  return (
    inFlight.has(document.status) ||
    awaitingDelivery(document) ||
    document.deliveries.some((delivery) => delivery.status === "PENDING")
  );
}
