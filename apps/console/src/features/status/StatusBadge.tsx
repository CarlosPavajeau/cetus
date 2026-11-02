import { cn } from "~/lib/utils";

import { statusPageUrl } from "./links";

/**
 * Better Stack's live badge for the status page. One per theme, picked by CSS like the rest of the console's
 * colors; the hidden one never loads.
 */
export function StatusBadge({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Badge theme="light" className="dark:hidden" />
      <Badge theme="dark" className="hidden dark:block" />
    </div>
  );
}

function Badge({ theme, className }: { theme: "light" | "dark"; className: string }) {
  return (
    <iframe
      title="Estado de Cetus"
      src={`${statusPageUrl}/badge?theme=${theme}`}
      width={250}
      height={30}
      loading="lazy"
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      // The badge declares no color-scheme; a dark one here would paint it over an opaque white backdrop.
      style={{ colorScheme: "normal" }}
      className={cn(className, "max-w-full border-0")}
    />
  );
}
