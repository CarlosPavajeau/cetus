import { FlaskConicalIcon } from "lucide-react";

import { useActiveEnvironment } from "./queries";

/** Always visible while the console works in the sandbox, so nobody takes a simulated document for real. */
export function SandboxBanner() {
  if (useActiveEnvironment() !== "SANDBOX") {
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
