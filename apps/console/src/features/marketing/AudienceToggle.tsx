import { cn } from "cn";

import type { Audience } from "./links";

const audienceLabel: Record<Audience, string> = {
  dev: "Para desarrolladores",
  negocio: "Para negocios",
};

export function AudienceToggle({
  audience,
  onChange,
}: {
  audience: Audience;
  onChange: (audience: Audience) => void;
}) {
  return (
    <fieldset className="inline-flex rounded-lg border bg-muted p-0.5">
      <legend className="sr-only">Ver Cetus</legend>
      {(["dev", "negocio"] as const).map((each) => (
        <button
          key={each}
          type="button"
          aria-pressed={audience === each}
          onClick={() => onChange(each)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
            audience === each && "bg-background text-foreground shadow-sm",
          )}
        >
          {audienceLabel[each]}
        </button>
      ))}
    </fieldset>
  );
}
