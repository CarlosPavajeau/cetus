import { CheckIcon, CopyIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";

type CopyOutcome = "COPIED" | "FAILED";

const outcomeLabel: Record<CopyOutcome, string> = {
  COPIED: "Copiado",
  FAILED: "No se pudo copiar",
};

/** Copies a value to the clipboard and says so for a moment, or says that the browser refused. */
export function CopyButton({
  value,
  label,
  iconOnly = false,
  onCopy,
}: {
  value: string;
  /** What is copied, for assistive technology: "Copiar ID del emisor". */
  label: string;
  iconOnly?: boolean;
  onCopy?: () => void;
}) {
  const [outcome, setOutcome] = useState<CopyOutcome | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    clearTimeout(timer.current);
    const next = await navigator.clipboard.writeText(value).then(
      (): CopyOutcome => "COPIED",
      (): CopyOutcome => "FAILED",
    );
    if (next === "COPIED") {
      onCopy?.();
    }
    setOutcome(next);
    timer.current = setTimeout(() => setOutcome(null), next === "FAILED" ? 4000 : 2000);
  }

  const Icon = outcome === "COPIED" ? CheckIcon : outcome === "FAILED" ? XIcon : CopyIcon;
  const status = <output className="sr-only">{outcome && outcomeLabel[outcome]}</output>;
  return iconOnly ? (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={copy}
        aria-label={label}
        title={outcome ? outcomeLabel[outcome] : label}
      >
        <Icon />
      </Button>
      {status}
    </>
  ) : (
    <>
      <Button variant="outline" size="sm" onClick={copy} aria-label={label}>
        <Icon data-icon="inline-start" />
        {outcome ? outcomeLabel[outcome] : "Copiar"}
      </Button>
      {status}
    </>
  );
}
