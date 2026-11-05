import { Link } from "@tanstack/react-router";
import { cn } from "cn";

import { CetusMark } from "~/components/CetusMark";
import { badgeVariants } from "~/components/ui/badge";
import { statusPageUrl } from "~/features/status/links";
import { docsUrl } from "~/lib/docs";

import { ConsoleCta, SignInLink } from "./ConsoleCta";
import { MobileMenu } from "./MobileMenu";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Cetus, inicio">
          <CetusMark />
          <span className="text-lg font-semibold">Cetus</span>
        </Link>
        <a
          href={`${docsUrl}/cambios`}
          className={cn(badgeVariants({ variant: "muted" }), "max-sm:hidden")}
        >
          Novedades
        </a>
        <nav
          aria-label="Principal"
          className="hidden flex-1 items-center gap-5 text-sm text-muted-foreground md:flex"
        >
          <a href={docsUrl} className="hover:text-foreground">
            Documentación
          </a>
          <Link
            to="/precios"
            className="hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            Precios
          </Link>
          <Link
            to="/contadores"
            className="hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            Contadores
          </Link>
          <a href={statusPageUrl} className="hover:text-foreground max-lg:hidden">
            Estado del servicio
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SignInLink />
          <ConsoleCta section="nav" label="Crear cuenta" size="default" />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
