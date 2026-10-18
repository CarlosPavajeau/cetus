import type { ReactNode } from "react";

export function PageHeader({ title, lead }: { title: string; lead: ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{lead}</p>
    </header>
  );
}
