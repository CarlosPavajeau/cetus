import { FlaskConicalIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Marks what only applies to the simulation, with the console's sky banner. */
export function Sandbox({
  title = "Modo simulación",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="my-4 flex gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
      <FlaskConicalIcon className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-1 [&>p]:m-0">
        <p className="font-medium">{title}</p>
        {children}
      </div>
    </div>
  );
}
