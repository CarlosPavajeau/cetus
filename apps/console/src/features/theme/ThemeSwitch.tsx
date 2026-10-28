import { MoonIcon, SunIcon } from "lucide-react";

import { cn } from "~/lib/utils";

import { setTheme, useTheme } from "./theme";

const icons = [
  { theme: "light", Icon: SunIcon },
  { theme: "dark", Icon: MoonIcon },
] as const;

/** Same shape as the docs site's switch, so both read as one product. */
export function ThemeSwitch({ className }: { className?: string }) {
  const theme = useTheme();

  return (
    <button
      type="button"
      aria-label="Cambiar el tema"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={cn(
        "inline-flex items-center rounded-full border p-1 text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      {icons.map(({ theme: value, Icon }) => (
        <Icon
          key={value}
          fill="currentColor"
          className={cn(
            "size-6.5 rounded-full p-1.5",
            theme === value && "bg-accent text-accent-foreground",
          )}
        />
      ))}
    </button>
  );
}
