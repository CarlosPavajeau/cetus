import { ScanLineIcon } from "lucide-react";

export function CetusMark() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-fd-primary text-fd-primary-foreground">
        <ScanLineIcon className="size-4" strokeWidth={1.8} />
      </span>
      <span className="font-semibold">Cetus</span>
    </span>
  );
}
