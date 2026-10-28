import { MoonIcon, SunIcon } from "lucide-react";

import { cn } from "~/lib/utils";

import { setTheme, useTheme } from "./theme";

const options = [
  { theme: "light", label: "Claro", Icon: SunIcon },
  { theme: "dark", label: "Oscuro", Icon: MoonIcon },
] as const;

/** Styled as the console's tabs, its other segmented control. */
export function ThemeSwitch({ className }: { className?: string }) {
  const theme = useTheme();

  return (
    <fieldset
      className={cn(
        "inline-flex h-9 items-center rounded-[calc(var(--radius-md)+3px)] bg-muted p-[3px]",
        className,
      )}
    >
      <legend className="sr-only">Tema</legend>
      {options.map(({ theme: value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            "inline-flex size-7.5 items-center justify-center rounded-md border border-transparent text-muted-foreground outline-none hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring",
            theme === value &&
              "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30",
          )}
        >
          <Icon fill="currentColor" className="size-3.5" />
        </button>
      ))}
    </fieldset>
  );
}
