import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { CetusMark } from "~/components/CetusMark";
import { legalOwner } from "~/features/legal/documents";
import { statusPageUrl } from "~/features/status/links";
import { docsUrl } from "~/lib/docs";
import { supportEmail } from "~/lib/support";

const year = new Date().getFullYear();

export function MarketingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-6 md:px-6">
        <div className="flex flex-col gap-3 md:col-span-2">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Cetus, inicio">
            <CetusMark />
            <span className="text-lg font-semibold">Cetus</span>
          </Link>
          <p className="max-w-xs text-sm text-muted-foreground">
            API de facturación electrónica para Colombia, conectada a la DIAN.
          </p>
        </div>
        <FooterColumn title="Producto">
          <li>
            <Link to="/precios" className="hover:text-foreground">
              Precios
            </Link>
          </li>
          <li>
            <Link to="/contadores" className="hover:text-foreground">
              Para contadores
            </Link>
          </li>
          <li>
            <a href={statusPageUrl} className="hover:text-foreground">
              Estado del servicio
            </a>
          </li>
          <li>
            <a href={`${docsUrl}/cambios`} className="hover:text-foreground">
              Novedades
            </a>
          </li>
        </FooterColumn>
        <FooterColumn title="Desarrolladores">
          <li>
            <a href={docsUrl} className="hover:text-foreground">
              Documentación
            </a>
          </li>
          <li>
            <a href={`${docsUrl}/inicio-rapido/desarrolladores`} className="hover:text-foreground">
              Inicio rápido
            </a>
          </li>
          <li>
            <a href={`${docsUrl}/guias/webhooks`} className="hover:text-foreground">
              Webhooks
            </a>
          </li>
          <li>
            <a href={`${docsUrl}/openapi.public.json`} className="hover:text-foreground">
              OpenAPI
            </a>
          </li>
        </FooterColumn>
        <FooterColumn title="Recursos">
          <li>
            <Link to="/estoy-obligado-a-facturar" className="hover:text-foreground">
              ¿Estoy obligado a facturar?
            </Link>
          </li>
        </FooterColumn>
        <FooterColumn title="Empresa">
          <li>
            <a href={`mailto:${supportEmail}`} className="hover:text-foreground">
              Contacto
            </a>
          </li>
          <li>
            <Link to="/legal/terminos" className="hover:text-foreground">
              Términos de servicio
            </Link>
          </li>
          <li>
            <Link to="/legal/privacidad" className="hover:text-foreground">
              Tratamiento de datos
            </Link>
          </li>
          <li>
            <Link to="/legal/encargo" className="hover:text-foreground">
              Encargo de tratamiento
            </Link>
          </li>
        </FooterColumn>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground md:px-6">
          © {year} Cetus · Operado por {legalOwner.name}
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">{title}</h2>
      <ul className="flex flex-col gap-2 text-sm text-muted-foreground">{children}</ul>
    </div>
  );
}
