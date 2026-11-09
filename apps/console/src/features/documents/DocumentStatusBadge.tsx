import { type BadgeStatus, StatusBadge } from "~/components/ui/badge";
import type { DocumentStatus, Environment } from "~/lib/api/types";

import { documentStatusName } from "./labels";

const badgeStatus: Record<DocumentStatus, BadgeStatus> = {
  RECEIVED: "idle",
  PROCESSING: "pending",
  SUBMITTED: "pending",
  ACCEPTED: "success",
  REJECTED: "error",
  FAILED: "warning",
};

export function DocumentStatusBadge({
  status,
  environment,
}: {
  status: DocumentStatus;
  environment: Environment;
}) {
  return (
    <StatusBadge status={badgeStatus[status]}>
      {documentStatusName(status, environment)}
    </StatusBadge>
  );
}
