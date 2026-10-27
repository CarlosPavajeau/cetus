import { ArrowUpRightIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";

import { type Step, steps } from "./steps";

/**
 * The frame every step shares: its title, the form panel next to its guide, and the navigation
 * at the bottom. It is the step's <form>, so "Continuar" submits it.
 */
export function StepLayout({
  step,
  lead,
  guide,
  error,
  submitting,
  onSubmit,
  onBack,
  after,
  children,
}: {
  step: Step;
  lead: string;
  guide: ReactNode;
  /** The error of the last save, if it failed. */
  error?: string;
  submitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  /** Shown under the panel and the guide. */
  after?: ReactNode;
  children: ReactNode;
}) {
  const next = steps.at(step);
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
      <div className="flex flex-col gap-5.5">
        <div className="flex flex-col gap-1.75">
          <h2 className="font-heading text-2xl font-normal tracking-tight">
            {steps.at(step - 1)?.title}
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">{lead}</p>
        </div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-7 rounded-lg border p-4 sm:p-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {children}
          </div>
          <aside className="flex w-full shrink-0 flex-col gap-5 lg:sticky lg:top-6 lg:w-80">
            {guide}
          </aside>
        </div>
        {after}
      </div>

      <div className="mt-auto flex flex-col gap-5 pt-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
            {step === 1 ? "Salir" : "Atrás"}
          </Button>
          <div className="flex items-center gap-4.5">
            <p className="text-xs text-muted-foreground max-sm:hidden">
              {next ? `Siguiente: ${next.title}` : "Último paso del asistente"}
            </p>
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              {submitting ? "Guardando…" : next ? "Continuar" : "Finalizar configuración"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-2xs text-muted-foreground">
          <p>Esta configuración no implica una validación ni habilitación ante la DIAN.</p>
          <p>Cetus · Colombia</p>
        </div>
      </div>
    </form>
  );
}

/** A titled group of fields inside the form panel. */
export function FieldSection({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-medium">{title}</h3>
        {lead && <p className="text-sm text-muted-foreground">{lead}</p>}
      </div>
      {children}
    </section>
  );
}

/** Fields side by side on wide screens, stacked on narrow ones. */
export function FieldRow({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("grid grid-cols-1 items-start gap-4 sm:grid-cols-3", className)}>
      {children}
    </div>
  );
}

/**
 * The card next to the form that explains where the data comes from. Numbered tips are the steps
 * to follow, in order, on the DIAN portal or with the documents at hand.
 */
export function StepGuide({
  title,
  lead,
  tips,
  numbered,
  link,
  note,
}: {
  title: string;
  lead: string;
  tips: { title: string; text: ReactNode }[];
  numbered?: boolean;
  link?: { href: string; label: string };
  note: string;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-lg border bg-card p-5">
      <div className="flex flex-col gap-2">
        <p className="text-base font-medium">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{lead}</p>
      </div>
      <div className="h-px bg-border" />
      <ol className="flex flex-col gap-4">
        {tips.map((tip, index) => (
          <li key={tip.title} className="flex gap-3">
            {numbered && (
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-2xs font-medium tabular-nums"
                aria-hidden
              >
                {index + 1}
              </span>
            )}
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{tip.title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{tip.text}</p>
            </div>
          </li>
        ))}
      </ol>
      {link && (
        <a
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="flex w-fit items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
        >
          {link.label}
          <ArrowUpRightIcon className="size-3.5" aria-hidden />
        </a>
      )}
      <div className="h-px bg-border" />
      <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>
    </div>
  );
}

/** The notice about secrets shown under the credentials and the certificate. */
export function SecretNotice({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-2.5 rounded-md border p-3 [&_svg]:mt-0.5 [&_svg]:size-3.75 [&_svg]:shrink-0">
      {icon}
      <div className="flex flex-col gap-0.75 leading-normal">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
