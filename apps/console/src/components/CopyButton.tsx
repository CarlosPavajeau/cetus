import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";

/** Copies a value to the clipboard and says so for a moment. */
export function CopyButton({
  value,
  label,
  iconOnly = false,
}: {
  value: string;
  /** What is copied, for assistive technology: "Copiar ID del emisor". */
  label: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const icon = copied ? (
    <CheckIcon data-icon="inline-start" />
  ) : (
    <CopyIcon data-icon="inline-start" />
  );
  return iconOnly ? (
    <Button variant="ghost" size="icon-xs" onClick={copy} aria-label={label} title={label}>
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  ) : (
    <Button variant="outline" size="sm" onClick={copy} aria-label={label}>
      {icon}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}
