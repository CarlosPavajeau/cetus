import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

import { CetusMark } from "~/components/CetusMark";
import { consoleUrl, signUpUrl, statusUrl } from "~/lib/site";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: <CetusMark />, url: "/" },
    links: [
      { text: "Guías", url: "/", active: "nested-url" },
      { text: "Referencia de la API", url: "/reference" },
      { text: "Estado", url: statusUrl, external: true },
      { text: "Iniciar sesión", url: `${consoleUrl}/sign-in`, external: true, secondary: true },
      { text: "Crear cuenta", url: signUpUrl, external: true, secondary: true },
    ],
  };
}
