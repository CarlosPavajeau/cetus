import { Link } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";

import { cn } from "~/lib/utils";

import { type Step, steps } from "./steps";

/**
 * "Paso n de 4" over one item per step, each with its number and title: done ones show a check, and
 * the reachable ones link back to their form.
 */
export function SetupProgress({
  current,
  completed,
  reachable,
}: {
  current: Step;
  completed: boolean[];
  /** The last step the person can open: the first one without its piece. */
  reachable: Step;
}) {
  return (
    <nav aria-label="Pasos de la configuración" className="flex flex-col gap-3">
      <p className="text-xs tracking-wider text-muted-foreground uppercase">
        Paso {current} de {steps.length}
      </p>
      <ol className="grid grid-cols-4 gap-2">
        {steps.map((step, index) => {
          const { number } = step;
          const isCurrent = number === current;
          const done = completed[index] === true;
          const status = isCurrent ? "En este paso" : done ? "Completado" : "Pendiente";
          const content = (
            <>
              <span
                className={cn(
                  "block h-1 w-full rounded-full",
                  isCurrent || done ? "bg-primary" : "bg-border",
                )}
              />
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border text-2xs tabular-nums",
                    isCurrent && "border-primary bg-primary text-primary-foreground",
                    done && !isCurrent && "border-primary text-primary",
                  )}
                  aria-hidden
                >
                  {done && !isCurrent ? <CheckIcon className="size-3" /> : number}
                </span>
                <span
                  className={cn(
                    "truncate text-sm max-md:hidden",
                    isCurrent ? "font-medium" : "text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {step.title}
                </span>
              </span>
              <span className="sr-only">{`${number}. ${step.title} · ${status}`}</span>
            </>
          );
          const target = "flex w-full flex-col gap-2 rounded-sm pb-1 outline-none";
          return (
            <li key={step.title} className="min-w-0" aria-current={isCurrent ? "step" : undefined}>
              {!isCurrent && number <= reachable ? (
                <Link
                  to="/setup"
                  search={(prev) => ({ ...prev, step: number })}
                  className={cn(
                    target,
                    "focus-visible:ring-3 focus-visible:ring-ring [&:hover_.truncate]:text-foreground",
                  )}
                >
                  {content}
                </Link>
              ) : (
                <span className={target}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
