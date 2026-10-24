import { describe, expect, it } from "vite-plus/test";

import { awaitingDelivery } from "~/features/documents/refresh";
import type { DocumentDetail } from "~/lib/api/types";

type Waiting = Parameters<typeof awaitingDelivery>[0];

function accepted(
  validatedAt: string | null,
  deliveries: DocumentDetail["deliveries"] = [],
): Waiting {
  return {
    status: "ACCEPTED",
    deliveries,
    dian: { statusCode: "00", statusMessage: null, errors: [], validatedAt },
  };
}

describe("awaitingDelivery", () => {
  const now = Date.now();

  it("waits for the email of a document the DIAN just accepted", () => {
    expect(awaitingDelivery(accepted(new Date(now - 5_000).toISOString()))).toBe(true);
  });

  it("stops once the delivery exists, or when it never came", () => {
    const delivery = {
      id: crypto.randomUUID(),
      channel: "EMAIL",
      recipient: null,
      status: "SKIPPED",
      error: null,
      sentAt: null,
      lastEventAt: null,
    } as const;
    expect(awaitingDelivery(accepted(new Date(now - 5_000).toISOString(), [delivery]))).toBe(false);
    expect(awaitingDelivery(accepted(new Date(now - 60 * 60_000).toISOString()))).toBe(false);
    expect(awaitingDelivery(accepted(null))).toBe(false);
  });
});
