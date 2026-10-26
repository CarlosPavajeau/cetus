import { cn } from "~/lib/utils";

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.charAt(0) ?? "";
  const last = words.length > 1 ? (words.at(-1)?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

/** Initials of an organization or a person, in the place of a logo or a photo. */
export function Monogram({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
