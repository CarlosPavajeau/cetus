import { statusUrl } from "~/lib/site";

/**
 * Better Stack's live badge for the status page. One per theme, picked by CSS so the prerendered page shows the
 * right one before it hydrates; the hidden one never loads.
 */
export function StatusBadge() {
  return (
    <>
      <Badge theme="light" className="dark:hidden" />
      <Badge theme="dark" className="hidden dark:block" />
    </>
  );
}

function Badge({ theme, className }: { theme: "light" | "dark"; className: string }) {
  return (
    <iframe
      title="Estado de Cetus"
      src={`${statusUrl}/badge?theme=${theme}`}
      width={250}
      height={30}
      loading="lazy"
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      // The badge declares no color-scheme; a dark one here would paint it over an opaque white backdrop.
      style={{ colorScheme: "normal" }}
      className={`${className} max-w-full border-0`}
    />
  );
}
