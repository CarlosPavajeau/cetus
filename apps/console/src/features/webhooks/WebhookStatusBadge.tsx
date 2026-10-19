import { Badge } from "~/components/ui/badge";
import type { WebhookEndpoint } from "~/lib/api/types";
import { cn } from "~/lib/utils";

import { endpointStatusLabel } from "./labels";

/** Active, failing (active with failures since its last 2xx) or disabled. */
export function WebhookStatusBadge({ endpoint }: { endpoint: WebhookEndpoint }) {
  const failing = endpoint.status === "ACTIVE" && endpoint.consecutiveFailures > 0;
  const dot =
    endpoint.status === "DISABLED"
      ? "bg-muted-foreground"
      : failing
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <Badge
      variant="outline"
      className={cn(endpoint.status === "DISABLED" && "text-muted-foreground")}
    >
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />
      {failing ? "Fallando" : endpointStatusLabel[endpoint.status]}
      {endpoint.disabledReason === "AUTOMATIC" && " por fallas"}
    </Badge>
  );
}
