import type { ReactNode } from "react";

/** One labeled value of a detail page. */
export function Entry({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-2xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

/** One labeled row of a ruled list: a `dl` whose rows are divided by hairlines. */
export function RuledEntry({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-x-6 gap-y-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)]">
      <dt className="text-2xs text-muted-foreground sm:pt-px sm:text-sm">{label}</dt>
      <dd className="flex min-w-0 flex-col gap-1 text-sm break-words">{children}</dd>
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
