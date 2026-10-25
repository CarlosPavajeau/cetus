import { consoleUrl } from "~/lib/site";

export function LegalLinks() {
  return (
    <nav aria-label="Legal" className="flex gap-3 px-2 text-xs text-fd-muted-foreground">
      <a href={`${consoleUrl}/legal/terminos`} className="hover:text-fd-foreground">
        Términos
      </a>
      <a href={`${consoleUrl}/legal/privacidad`} className="hover:text-fd-foreground">
        Privacidad
      </a>
    </nav>
  );
}
