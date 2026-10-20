import { type BadgeStatus, StatusBadge } from "~/components/ui/badge";
import type { DocumentStatus } from "~/lib/api/types";

import { documentStatusLabel } from "./labels";

const badgeStatus: Record<DocumentStatus, BadgeStatus> = {
  RECEIVED: "idle",
  PROCESSING: "pending",
  SUBMITTED: "pending",
  ACCEPTED: "success",
  REJECTED: "error",
  FAILED: "warning",
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return <StatusBadge status={badgeStatus[status]}>{documentStatusLabel[status]}</StatusBadge>;
}
