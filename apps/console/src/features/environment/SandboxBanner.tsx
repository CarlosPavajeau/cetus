import { FlaskConicalIcon } from "lucide-react";

import { useActiveEnvironment, usePageEnvironment } from "./queries";

/**
 * Always visible while the console works in the sandbox, so nobody takes a simulated document for real. A
 * page showing one document follows that document instead: a real one never sits under this warning.
 */
export function SandboxBanner() {
  const active = useActiveEnvironment();
  const page = usePageEnvironment();
  if ((page ?? active) !== "SANDBOX") {
    return null;
  }
  return (
    <aside
      aria-label="Modo simulación"
      className="flex items-center justify-center gap-2 bg-sky-100 px-4 py-1.5 text-xs text-sky-950 dark:bg-sky-950 dark:text-sky-100"
    >
      <FlaskConicalIcon className="size-3.5" aria-hidden />
      <span>
        <strong>Modo simulación:</strong> sin validez fiscal. Los documentos no se envían a la DIAN.
      </span>
    </aside>
  );
}
