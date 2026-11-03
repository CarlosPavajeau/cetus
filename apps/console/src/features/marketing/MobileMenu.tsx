import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MenuIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { statusPageUrl } from "~/features/status/links";
import { docsUrl } from "~/lib/docs";

import { visitorSessionQuery } from "./queries";

const itemClass = "rounded-md px-2 py-2 text-md hover:bg-muted";

/** The nav's links on phones, where the header only fits the logo and the call to action. */
export function MobileMenu() {
  const { data: session } = useQuery(visitorSessionQuery);

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Menú" />}
      >
        <MenuIcon />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1.5">
        <nav aria-label="Principal" className="flex flex-col">
          <a href={docsUrl} className={itemClass}>
            Documentación
          </a>
          <Link to="/precios" className={itemClass}>
            Precios
          </Link>
          <a href={statusPageUrl} className={itemClass}>
            Estado del servicio
          </a>
          {!session && (
            <Link to="/sign-in" className={itemClass}>
              Iniciar sesión
            </Link>
          )}
        </nav>
      </PopoverContent>
    </Popover>
  );
}
