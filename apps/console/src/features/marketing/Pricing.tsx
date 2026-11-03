import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";
import { useState } from "react";

import { type PricedOffer, priced } from "~/features/billing/labels";
import { type CatalogPeriod, PlanCatalog } from "~/features/billing/PlanCatalog";
import { supportEmail } from "~/lib/support";

import { linkButtonVariants } from "./linkButton";
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
  headingLevel,
}: {
  audience?: Audience;
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
    return null;
  }
  return (
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
  );
}

function PlanAction({ offer, audience }: { offer: PricedOffer; audience?: Audience }) {
  if (offer.kind === "TOPUP") {
    return null;
  }
  return (
    <Link
      to="/sign-up"
      search={audience && { audience }}
      className={linkButtonVariants({
        variant: offer.code === featuredPlanCode ? "default" : "outline",
      })}
    >
      Empezar gratis
    </Link>
  );
}

export function PartnersNote() {
  return (
    <p className="text-sm text-muted-foreground">
      ¿Eres contador o manejas muchas empresas? El plan Socios tiene condiciones a la medida.{" "}
      <a
        href={`mailto:${supportEmail}?subject=${encodeURIComponent("Plan Socios")}`}
        className="font-medium text-foreground underline underline-offset-4"
      >
        Escríbenos sobre el plan Socios
      </a>
      .
    </p>
  );
}

export function PricingPromises() {
  return (
    <ul className="grid gap-3 text-sm sm:grid-cols-2">
      {pricingPromises.map((promise) => (
        <li key={promise} className="flex gap-2">
          <CheckIcon className="mt-0.5 size-4 shrink-0 text-success-foreground" />
          {promise}
        </li>
      ))}
    </ul>
  );
}
