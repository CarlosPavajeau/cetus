import type { ReactNode } from "react";

import { Badge } from "~/components/ui/badge";

export function PageHeader({
  title,
  count,
  status,
  lead,
  action,
}: {
  title: string;
  count?: number;
  /** Shown next to the title, e.g. the state of the resource. */
  status?: ReactNode;
  lead: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-3">
          <h1 className="font-heading text-3xl font-normal tracking-tight">{title}</h1>
          {/* Baseline alignment leaves the badges' bottom padding below the title; lift them so they sit on it. */}
          <div className="flex -translate-y-1 items-center gap-3 empty:hidden">
            {count !== undefined && <Badge variant="outline">{count}</Badge>}
            {status}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{lead}</p>
      </div>
      {action}
    </header>
  );
}
