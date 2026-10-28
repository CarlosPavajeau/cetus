import { MoonIcon, SunIcon } from "lucide-react";

import { cn } from "~/lib/utils";

import { setTheme, useTheme } from "./theme";

const options = [
  { theme: "light", label: "Claro", Icon: SunIcon },
  { theme: "dark", label: "Oscuro", Icon: MoonIcon },
] as const;

/** Same shape as the docs site's switch, so both read as one product. */
export function ThemeSwitch({ className }: { className?: string }) {
  const theme = useTheme();

  return (
    <fieldset className={cn("inline-flex items-center gap-0.5 rounded-full border p-1", className)}>
      <legend className="sr-only">Tema</legend>
      {options.map(({ theme: value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            "size-6.5 rounded-full border border-transparent p-1.5 text-muted-foreground outline-none hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring",
            theme === value && "bg-accent text-accent-foreground",
          )}
        >
          <Icon fill="currentColor" className="size-full" />
        </button>
      ))}
    </fieldset>
  );
}
