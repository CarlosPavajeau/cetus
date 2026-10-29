import { Link } from "@tanstack/react-router";
import { ScanLineIcon } from "lucide-react";
import type { ReactNode } from "react";

import { versionDate } from "./documents";

const year = new Date().getFullYear();

/** A legal document for reading: open to anyone, with or without a session. */
export function LegalPage({
  title,
  version,
  children,
}: {
  title: string;
  version: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-card">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ScanLineIcon className="size-5" strokeWidth={1.8} />
            </span>
            <span className="text-lg font-semibold">Cetus</span>
          </Link>
          <nav
            aria-label="Documentos legales"
            className="flex gap-4 text-xs text-muted-foreground sm:gap-5 sm:text-sm"
          >
            <LegalNavLink to="/legal/terminos">Términos</LegalNavLink>
            <LegalNavLink to="/legal/privacidad">Privacidad</LegalNavLink>
            <LegalNavLink to="/legal/encargo">Encargo</LegalNavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 md:px-6 md:py-14">
        <h1 className="text-3xl/[1.2] font-semibold text-balance">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Vigente desde el {versionDate(version)}.
        </p>
        <article className="mt-8 text-base/[1.7] text-pretty [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:scroll-mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-balance [&_li]:mt-1.5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_strong]:font-semibold [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </article>
      </main>
      <footer className="border-t">
        <p className="mx-auto max-w-3xl px-4 py-6 text-xs text-muted-foreground md:px-6">
          © {year} Cetus
        </p>
      </footer>
    </div>
  );
}

function LegalNavLink({
  to,
  children,
}: {
  to: "/legal/terminos" | "/legal/privacidad" | "/legal/encargo";
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="hover:text-foreground"
      activeProps={{ className: "text-foreground font-medium" }}
    >
      {children}
    </Link>
  );
}
