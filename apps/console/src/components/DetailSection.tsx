import type { ReactNode } from "react";

/** One labeled value of a detail page. */
export function Entry({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-2xs text-muted-foreground">{label}</dt>
      <dd className="text-2xs break-words">{children}</dd>
    </div>
  );
}

/** A bordered block of a detail page, with its title and an optional action. */
export function Section({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border p-5" aria-labelledby={id}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-md font-medium">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
