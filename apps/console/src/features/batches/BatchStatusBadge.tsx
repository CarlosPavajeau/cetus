import { StatusBadge } from "~/components/ui/badge";
import type { BatchStatus } from "~/lib/api/types";

import { batchBadgeStatus, batchStatusLabel } from "./labels";

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return <StatusBadge status={batchBadgeStatus[status]}>{batchStatusLabel[status]}</StatusBadge>;
}
