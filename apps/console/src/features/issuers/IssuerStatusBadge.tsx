import { Badge } from "~/components/ui/badge";
import type { Issuer } from "~/lib/api/types";
import { cn } from "~/lib/utils";

import { statusLabel } from "./labels";

const dot: Record<Issuer["status"], string> = {
  ONBOARDING: "bg-amber-500",
  TESTING: "bg-sky-500",
  ENABLED: "bg-emerald-500",
  DISABLED: "bg-muted-foreground",
};

export function IssuerStatusBadge({ status }: { status: Issuer["status"] }) {
  return (
    <Badge variant="outline" className={cn(status === "DISABLED" && "text-muted-foreground")}>
      <span className={cn("size-1.5 rounded-full", dot[status])} aria-hidden />
      {statusLabel[status]}
    </Badge>
  );
}
