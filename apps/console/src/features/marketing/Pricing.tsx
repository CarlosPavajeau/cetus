import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { CheckIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import { type PricedOffer, priced } from "~/features/billing/labels";
import {
  type CatalogPeriod,
  PlanCatalog,
  PlanCatalogSkeleton,
} from "~/features/billing/PlanCatalog";
import { supportEmail } from "~/lib/support";

import { track } from "./analytics";
import { ConsoleCta } from "./ConsoleCta";
import type { Audience } from "./links";
import { publicPlansQuery } from "./queries";

/** The plan the landing points most visitors to. */
export const featuredPlanCode = "CRECIMIENTO";

const pricingPromises = [
  "La simulación y las pruebas de habilitación no consumen documentos.",
  "Solo se cobran los documentos que la DIAN acepta; los rechazados no cuentan.",
  "Las notas crédito se emiten siempre, aunque no tengas saldo.",
  "Precios finales: Cetus no es responsable de IVA.",
] as const;

/** The public price list, from the API's catalog; no price is written in the landing. */
/** `headingLevel`: one below the heading of the section around the table. */
export function PricingTable({
  audience,
  page,
  headingLevel,
}: {
  audience?: Audience;
  page: "landing" | "precios";
  headingLevel: 2 | 3;
}) {
  const table = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = table.current;
    const observer =
      element === null
        ? null
        : new IntersectionObserver(
            ([entry], self) => {
              if (entry?.isIntersecting) {
                self.disconnect();
                track({ name: "pricing_view", page });
              }
            },
            { threshold: 0.3 },
          );
    if (element !== null) {
      observer?.observe(element);
    }
    return () => observer?.disconnect();
  }, [page]);

  return (
    <div ref={table}>
      <PriceList audience={audience} headingLevel={headingLevel} />
    </div>
  );
}

function PriceList({
  audience,
  headingLevel,
}: {
  audience: Audience | undefined;
  headingLevel: 2 | 3;
}) {
  const { data: offers, isError } = useQuery(publicPlansQuery);
  const [period, setPeriod] = useState<CatalogPeriod>("mensual");

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        No pudimos cargar los precios. Vuelve a intentarlo en un momento o escríbenos a{" "}
        <a href={`mailto:${supportEmail}`} className="underline underline-offset-3">
          {supportEmail}
        </a>
        .
      </p>
    );
  }
  if (offers === undefined) {
    return (
      <div className="flex flex-col gap-6">
        <PlanCatalogSkeleton />
        <Skeleton className="h-10 max-w-prose" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PlanCatalog
        offers={offers.filter(priced)}
        period={period}
        onPeriodChange={setPeriod}
        featuredCode={featuredPlanCode}
        headingLevel={headingLevel}
        topupNote="Se compran con un paquete anual vigente."
        emptyNote={
          <p className="text-sm text-muted-foreground">
            No hay planes publicados por ahora. Escríbenos a{" "}
            <a href={`mailto:${supportEmail}`} className="underline underline-offset-3">
              {supportEmail}
            </a>
            .
          </p>
        }
        renderAction={(offer) => <PlanAction offer={offer} audience={audience} />}
      />
      <p className="max-w-prose text-sm text-muted-foreground">
        Creas la cuenta gratis y emites en simulación desde el primer minuto. El plan lo contratas
        en la consola cuando vayas a emitir en producción.
      </p>
    </div>
  );
}

/** A visitor creates the account first and buys from the console; a signed-in one goes straight to buy. */
function PlanAction({ offer, audience }: { offer: PricedOffer; audience?: Audience }) {
  if (offer.kind === "TOPUP") {
    return null;
  }
  return (
    <ConsoleCta
      audience={audience}
      section="pricing"
      label="Crear cuenta gratis"
      size="default"
      variant={offer.code === featuredPlanCode ? "default" : "outline"}
      plan={offer.code}
      signedIn={{
        to: "/billing/products",
        label: "Contratar en la consola",
        periodo: offer.kind === "SUBSCRIPTION" ? "mensual" : "anual",
      }}
    />
  );
}

export function PartnersNote() {
  return (
    <p className="text-sm text-muted-foreground">
      ¿Eres contador o manejas muchas empresas? El plan Socios tiene condiciones a la medida.{" "}
      <Link
        to="/contadores"
        hash="socios"
        className="font-medium text-foreground underline underline-offset-4"
      >
        Conoce el plan Socios
      </Link>
      .
    </p>
  );
}

export function PricingPromises({ className }: { className?: string }) {
  return (
    <ul className={cn("grid gap-3 text-sm sm:grid-cols-2", className)}>
      {pricingPromises.map((promise) => (
        <li key={promise} className="flex gap-2">
          <CheckIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {promise}
        </li>
      ))}
    </ul>
  );
}
