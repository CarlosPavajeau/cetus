import { StatusBadge } from "~/components/ui/badge";
import type { WebhookEndpoint } from "~/lib/api/types";

import { endpointStatusLabel } from "./labels";

/** Active, failing (active with failures since its last 2xx) or disabled. */
export function WebhookStatusBadge({ endpoint }: { endpoint: WebhookEndpoint }) {
  const failing = endpoint.status === "ACTIVE" && endpoint.consecutiveFailures > 0;
  const status = endpoint.status === "DISABLED" ? "idle" : failing ? "warning" : "success";
  return (
    <StatusBadge status={status}>
      {failing ? "Fallando" : endpointStatusLabel[endpoint.status]}
      {endpoint.disabledReason === "AUTOMATIC" && " por fallas"}
    </StatusBadge>
  );
}
