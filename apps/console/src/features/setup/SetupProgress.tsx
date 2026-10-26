import { Link } from "@tanstack/react-router";

import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

import { type Step, steps } from "./steps";

/**
 * "Paso n de 4" over a bar with one segment per step: filled up to the current step and for the
 * ones already saved. Each segment names its step in a tooltip, and the reachable ones link back to it.
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
    <nav aria-label="Pasos de la configuración" className="flex flex-col gap-1">
      <p className="text-[10px] text-muted-foreground uppercase">
        Paso {current} de {steps.length}
      </p>
      <ol className="flex gap-1.5">
        {steps.map((step, index) => {
          const number = (index + 1) as Step;
          const isCurrent = number === current;
          const status = isCurrent ? "En este paso" : completed[index] ? "Completado" : "Pendiente";
          const label = `${number}. ${step.title} · ${status}`;
          const segment = (
            <span
              className={cn(
                "block h-1 w-full rounded-full",
                isCurrent || completed[index] ? "bg-primary" : "bg-border",
              )}
            />
          );
          // The segment is 4px tall; the padding gives it a comfortable target to hover and click.
          const target =
            "flex w-full py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring rounded-sm";
          return (
            <li key={step.title} className="flex-1" aria-current={isCurrent ? "step" : undefined}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    !isCurrent && number <= reachable ? (
                      <Link
                        to="/setup"
                        search={(prev) => ({ ...prev, step: number })}
                        className={target}
                      />
                    ) : (
                      <span className={target} />
                    )
                  }
                >
                  {segment}
                  <span className="sr-only">{label}</span>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
