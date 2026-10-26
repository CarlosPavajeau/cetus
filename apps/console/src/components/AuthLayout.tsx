import { Link } from "@tanstack/react-router";
import { ArrowUpRightIcon, CodeXmlIcon, FileCheck2Icon, ScanLineIcon } from "lucide-react";
import type { ReactNode } from "react";

import flowArrow from "~/assets/flow-arrow.svg";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { docsUrl } from "~/lib/docs";

const year = new Date().getFullYear();

function CetusMark() {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
      <ScanLineIcon className="size-5" strokeWidth={1.8} />
    </span>
  );
}

/** Two columns from `lg` up: the form on the left, the product pitch on the right. */
export function AuthLayout({
  icon,
  eyebrow = "CONSOLA CETUS",
  title,
  lead,
  headline = ["Tu producto.", "Nuestra API.", "Conectados a la DIAN."],
  children,
}: {
  /** Shown in a tile above the eyebrow. */
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  lead: string;
  /** Lines of the big message in the product panel. */
  headline?: readonly string[];
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-svh bg-card lg:grid-cols-[minmax(0,1fr)_minmax(0,39rem)]">
      <div className="flex min-h-svh flex-col px-6 pt-10 pb-8 md:px-12 [@media(max-height:50rem)]:py-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CetusMark />
            <span className="text-[1.375rem] font-semibold">Cetus</span>
          </div>
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Documentación
            <ArrowUpRightIcon className="size-3" />
          </a>
        </header>
        {/*
          Flexible gaps instead of fixed ones, so the page fits short screens without scrolling.
          From lg up the top gap stops at the 132px of the design and the rest goes below the form.
        */}
        <main className="flex flex-1 flex-col items-center">
          <div className="min-h-4 flex-1 lg:max-h-33" />
          <div className="flex w-full max-w-100 flex-col gap-7">
            <div className="flex flex-col gap-5">
              {icon && (
                <span className="flex size-12 items-center justify-center rounded-xl bg-secondary [&>svg]:size-6">
                  {icon}
                </span>
              )}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-muted-foreground">{eyebrow}</p>
                <h1 className="text-[2rem]/[1.2] font-semibold">{title}</h1>
                <p className="text-[0.875rem]/[1.6] text-muted-foreground">{lead}</p>
              </div>
            </div>
            {children}
          </div>
          <div className="min-h-4 flex-1" />
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-muted-foreground">
          <p className="text-xs whitespace-nowrap">© {year} Cetus</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm whitespace-nowrap">
            {/* Placeholder until the help center exists. */}
            <span>¿Necesitas ayuda?</span>
            <Link to="/legal/terminos" className="hover:text-foreground">
              Términos
            </Link>
            <Link to="/legal/privacidad" className="hover:text-foreground">
              Privacidad
            </Link>
          </div>
        </footer>
      </div>
      <aside className="hidden p-6 lg:flex" aria-hidden="true">
        <div className="flex flex-1 flex-col rounded-[calc(var(--radius)*2)] bg-secondary p-12 [@media(max-height:50rem)]:p-8">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-[2px] bg-primary" />
            API DE FACTURACIÓN ELECTRÓNICA
          </p>
          <div className="max-h-28 min-h-6 flex-1" />
          <div className="flex flex-col gap-8">
            {/* Same height for every headline, so the diagram does not move between screens. */}
            <div className="flex min-h-55 flex-col gap-5 [@media(max-height:50rem)]:min-h-0">
              <p className="text-4xl/[1.2] font-medium tracking-[-1px] text-card-foreground">
                {headline.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
              <p className="text-[0.9375rem]/[1.6] text-muted-foreground">
                Factura electrónica para Colombia, como una API. Tú construyes el producto; nosotros
                hablamos con la DIAN.
              </p>
            </div>
            <div className="flex flex-col gap-7 rounded-xl border bg-card p-6">
              <div className="flex items-center justify-between text-xs">
                <div className="flex flex-col items-center gap-2.5 text-muted-foreground">
                  <span className="flex size-11 items-center justify-center rounded-lg border">
                    <CodeXmlIcon className="size-5" strokeWidth={1.5} />
                  </span>
                  Tu producto
                </div>
                <img src={flowArrow} alt="" width={35} height={16} />
                <div className="flex flex-col items-center gap-2.5 font-medium">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-primary">
                    <CetusMark />
                  </span>
                  Cetus
                </div>
                <img src={flowArrow} alt="" width={35} height={16} />
                <div className="flex flex-col items-center gap-2.5 text-muted-foreground">
                  <span className="flex size-11 items-center justify-center rounded-lg border">
                    <FileCheck2Icon className="size-5" strokeWidth={1.5} />
                  </span>
                  DIAN
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex flex-col gap-1">
                  <p className="font-medium">Primero pruebas. Después, producción.</p>
                  <p className="text-muted-foreground">La misma integración. Una nueva llave.</p>
                </div>
                <Badge variant="outline" className="text-muted-foreground">
                  Sandbox
                </Badge>
              </div>
            </div>
          </div>
          <div className="min-h-6 flex-1" />
          <div className="flex justify-between border-t pt-5 text-xs text-muted-foreground">
            <p>Hecho para Colombia</p>
            <p>Integración con DIAN</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
