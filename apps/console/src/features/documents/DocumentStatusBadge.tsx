import { Badge } from "~/components/ui/badge";
import type { DocumentStatus } from "~/lib/api/types";
import { cn } from "~/lib/utils";

import { documentStatusLabel } from "./labels";

const dot: Record<DocumentStatus, string> = {
  RECEIVED: "bg-muted-foreground",
  PROCESSING: "bg-sky-500",
  SUBMITTED: "bg-sky-500",
  ACCEPTED: "bg-emerald-500",
  REJECTED: "bg-red-500",
  FAILED: "bg-amber-500",
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <Badge variant="outline" className={cn(status === "RECEIVED" && "text-muted-foreground")}>
      <span className={cn("size-1.5 rounded-full", dot[status])} aria-hidden />
      {documentStatusLabel[status]}
    </Badge>
  );
}
