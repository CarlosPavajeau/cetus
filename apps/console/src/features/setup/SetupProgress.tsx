import { Link } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";

import { cn } from "~/lib/utils";

import { type Step, steps } from "./steps";

/** The four steps of the assistant. Completed and reachable steps link back to their form. */
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
    <nav aria-label="Pasos de la configuración" className="border-y py-5">
      <ol className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {steps.map((step, index) => {
          const number = (index + 1) as Step;
          const isCurrent = number === current;
          const isDone = completed[index] && !isCurrent;
          const content = (
            <>
              <span
                className={cn(
                  "flex size-7.5 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                  isCurrent && "border-primary bg-primary text-primary-foreground",
                  isDone && "bg-accent text-foreground",
                  !isCurrent && !isDone && "bg-background text-muted-foreground",
                )}
              >
                {isDone ? <CheckIcon className="size-3.5" aria-hidden /> : number}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span
                  className={cn(
                    "truncate text-xs",
                    isCurrent && "font-semibold",
                    !isCurrent && !isDone && "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {isCurrent ? "En este paso" : isDone ? "Completado" : "Pendiente"}
                </span>
              </span>
            </>
          );
          return (
            <li key={step.title} aria-current={isCurrent ? "step" : undefined}>
              {!isCurrent && number <= reachable ? (
                <Link
                  to="/setup"
                  search={{ step: number }}
                  className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
