import { useId, type ReactNode } from "react";

/** A full-width band of the landing: a short opinionated title, a lead, and its content. */
export function Section({
  eyebrow,
  title,
  lead,
  children,
  id,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  const titleId = useId();
  return (
    <section id={id} aria-labelledby={titleId} className="scroll-mt-16 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-section md:px-6">
        <div className="flex max-w-2xl flex-col gap-3">
          {eyebrow !== undefined && (
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {eyebrow}
            </p>
          )}
          <h2
            id={titleId}
            className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl"
          >
            {title}
          </h2>
          {lead !== undefined && (
            <p className="text-lg text-pretty text-muted-foreground">{lead}</p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
