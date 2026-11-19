import { StatusBadge } from "~/components/ui/badge";
import type { BatchView } from "~/lib/api/types";

import { batchBadgeStatus, batchStatusLabel } from "./labels";

export function BatchStatusBadge({ batch }: { batch: Pick<BatchView, "status" | "waiting"> }) {
  if (batch.waiting) {
    return <StatusBadge status="idle">{batchStatusLabel.RECEIVED}</StatusBadge>;
  }
  return (
    <StatusBadge status={batchBadgeStatus[batch.status]}>
      {batchStatusLabel[batch.status]}
    </StatusBadge>
  );
}
