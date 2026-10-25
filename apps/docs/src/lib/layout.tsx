import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

import { CetusMark } from "~/components/CetusMark";
import { consoleUrl } from "~/lib/site";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: <CetusMark />, url: "/" },
    links: [
      { text: "Guías", url: "/", active: "nested-url" },
      { text: "Referencia de la API", url: "/reference" },
      { text: "Iniciar sesión", url: `${consoleUrl}/sign-in`, external: true, secondary: true },
      { text: "Crear cuenta", url: `${consoleUrl}/sign-up`, external: true, secondary: true },
    ],
  };
}
