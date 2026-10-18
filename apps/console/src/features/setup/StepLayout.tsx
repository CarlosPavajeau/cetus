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
          <h2 className="font-heading text-[22px] font-normal tracking-tight">
            {steps.at(step - 1)?.title}
          </h2>
          <p className="text-sm text-muted-foreground">{lead}</p>
        </div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6 rounded-lg border p-4 sm:p-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {children}
          </div>
          <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-74">{guide}</aside>
        </div>
        {after}
      </div>

      <div className="mt-auto flex flex-col gap-5 pt-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
            {step === 1 ? "Volver a configuración" : "Atrás"}
          </Button>
          <div className="flex items-center gap-4.5">
            <p className="text-2xs text-muted-foreground max-sm:hidden">
              {next ? `Siguiente: ${next.title}` : "Último paso del asistente"}
            </p>
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              {submitting ? "Guardando…" : next ? "Continuar" : "Guardar y finalizar"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-[10px] text-muted-foreground">
          <p>Esta configuración no implica una validación ni habilitación ante la DIAN.</p>
          <p>Cetus · Colombia</p>
        </div>
      </div>
    </form>
  );
}

/** A titled group of fields inside the form panel. */
export function FieldSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-sm font-medium">{title}</h3>
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

/** The card next to the form that explains where the data comes from. */
export function StepGuide({
  title,
  lead,
  tips,
  note,
}: {
  title: string;
  lead: string;
  tips: { title: string; text: string }[];
  note: string;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-lg border bg-card p-5">
      <div className="flex flex-col gap-2.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{lead}</p>
      </div>
      <div className="h-px bg-border" />
      {tips.map((tip) => (
        <div key={tip.title} className="flex flex-col gap-1.5">
          <p className="text-xs font-medium">{tip.title}</p>
          <p className="text-2xs leading-relaxed text-muted-foreground">{tip.text}</p>
        </div>
      ))}
      <div className="h-px bg-border" />
      <p className="text-[10px] leading-relaxed text-muted-foreground">{note}</p>
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
    <div className="flex gap-2.5 rounded-md border bg-secondary p-3 [&_svg]:mt-0.5 [&_svg]:size-3.75 [&_svg]:shrink-0">
      {icon}
      <div className="flex flex-col gap-0.75 leading-normal">
        <p className="text-2xs font-medium">{title}</p>
        <p className="text-[10px] text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
