import type { ReactNode } from "react";

import { Badge } from "~/components/ui/badge";

export function PageHeader({
  title,
  count,
  lead,
  action,
}: {
  title: string;
  count?: number;
  lead: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-3xl font-normal tracking-tight">{title}</h1>
          {count !== undefined && <Badge variant="outline">{count}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{lead}</p>
      </div>
      {action}
    </header>
  );
}
