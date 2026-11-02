import { Link } from "@tanstack/react-router";
import { useId, type ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import {
  documentCostCents,
  documentCostLabel,
  documentsLabel,
  formatCents,
  issuersLabel,
  overageLabel,
  priceBreakdown,
  pricePeriodLabel,
  type PricedOffer,
  validityLabel,
} from "./labels";

export type CatalogPeriod = "mensual" | "anual";

export const catalogPeriods: readonly CatalogPeriod[] = ["mensual", "anual"];

/**
 * The plans as a price list, monthly subscriptions apart from annual packages and their top-ups. It reads no
 * account: `renderAction` decides what each plan offers the viewer, and `topupNote` why top-ups cannot be bought yet.
 */
export function PlanCatalog({
  offers,
  period,
  onPeriodChange,
  renderAction,
  topupNote,
}: {
  offers: PricedOffer[];
  period: CatalogPeriod;
  onPeriodChange: (period: CatalogPeriod) => void;
  renderAction: (offer: PricedOffer) => ReactNode;
  topupNote?: string;
}) {
  const sorted = offers.toSorted((a, b) => a.version.totalCents - b.version.totalCents);
  const subscriptions = sorted.filter((offer) => offer.kind === "SUBSCRIPTION");
  const packages = sorted.filter((offer) => offer.kind === "PACKAGE");
  const topups = sorted.filter((offer) => offer.kind === "TOPUP");

  return (
    <Tabs
      value={period}
      onValueChange={(value) => {
        const next = catalogPeriods.find((each) => each === value);
        if (next) {
          onPeriodChange(next);
        }
      }}
    >
      <TabsList aria-label="Periodo de cobro">
        <TabsTrigger value="mensual">Mensual</TabsTrigger>
        <TabsTrigger value="anual">Anual</TabsTrigger>
      </TabsList>

      <TabsContent value="mensual" className="mt-3">
        <div className="flex flex-col gap-4">
          <p className="max-w-prose text-md text-muted-foreground">
            Pagas cada mes por adelantado. Si emites más documentos de los incluidos, sigues
            emitiendo y el excedente se cobra al cierre del mes.
          </p>
          <PlanColumns offers={subscriptions} renderAction={renderAction} />
        </div>
      </TabsContent>

      <TabsContent value="anual" className="mt-3">
        <div className="flex flex-col gap-4">
          <p className="max-w-prose text-md text-muted-foreground">
            Pagas una vez y usas los documentos durante la vigencia del paquete, compartidos entre
            todos tus emisores. Si se acaban, los amplías con una recarga.
          </p>
          <PlanColumns offers={packages} renderAction={renderAction} />
          {topups.length > 0 && (
            <TopupList offers={topups} renderAction={renderAction} note={topupNote} />
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function PlanColumns({
  offers,
  renderAction,
}: {
  offers: PricedOffer[];
  renderAction: (offer: PricedOffer) => ReactNode;
}) {
  if (offers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay planes disponibles por ahora. Si necesitas uno, escríbenos desde{" "}
        <Link to="/help" className="underline underline-offset-3 hover:text-foreground">
          Ayuda
        </Link>
        .
      </p>
    );
  }
  const costMax = Math.max(...offers.map((offer) => documentCostCents(offer.version)));

  return (
    <div className="grid divide-y rounded-xl border bg-card lg:auto-cols-fr lg:grid-flow-col lg:divide-x lg:divide-y-0">
      {offers.map((offer) => (
        <PlanColumn key={offer.id} offer={offer} costMax={costMax} footer={renderAction(offer)} />
      ))}
    </div>
  );
}

function PlanColumn({
  offer,
  costMax,
  footer,
}: {
  offer: PricedOffer;
  costMax: number;
  footer: ReactNode;
}) {
  const titleId = useId();
  const { version } = offer;
  const period = pricePeriodLabel(offer);

  return (
    <article aria-labelledby={titleId} className="flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="text-md font-medium">
          {offer.name}
        </h2>
        <p className="tabular-nums">
          <span className="font-heading text-3xl tracking-tight">
            {formatCents(version.totalCents)}
          </span>
          {period !== null && <span className="text-sm text-muted-foreground"> {period}</span>}
        </p>
        <p className="text-xs text-muted-foreground">{priceBreakdown(version)}</p>
      </div>

      <DocumentCost cents={documentCostCents(version)} costMax={costMax} />

      <ul className="flex flex-col gap-1.5 text-sm">
        <li>
          {documentsLabel(version.documentsIncluded)}
          {offer.kind === "SUBSCRIPTION" ? " cada mes" : " en total"}
        </li>
        {version.issuersIncluded !== null && <li>{issuersLabel(version.issuersIncluded)}</li>}
        {offer.validityMonths !== null && <li>{validityLabel(offer.validityMonths)}</li>}
        {version.priceOverageCents !== null && <li>{overageLabel(version.priceOverageCents)}</li>}
      </ul>

      <div className="mt-auto flex items-center pt-1 empty:hidden">{footer}</div>
    </article>
  );
}

/** The plan's unit cost, and a bar against the dearest plan of its group so the cheaper volume reads at a glance. */
function DocumentCost({ cents, costMax }: { cents: number; costMax: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max((cents / costMax) * 100, 4)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">{documentCostLabel(cents)}</p>
    </div>
  );
}

function TopupList({
  offers,
  renderAction,
  note,
}: {
  offers: PricedOffer[];
  renderAction: (offer: PricedOffer) => ReactNode;
  note: string | undefined;
}) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 pt-4">
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="text-md font-medium">
          Recargas
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Suman documentos a tu paquete anual. Cada recarga tiene su propia vigencia, contada desde
          la compra.
        </p>
        {note !== undefined && <p className="text-sm font-medium">{note}</p>}
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {offers.map((offer) => (
          <TopupRow key={offer.id} offer={offer} footer={renderAction(offer)} />
        ))}
      </ul>
    </section>
  );
}

function TopupRow({ offer, footer }: { offer: PricedOffer; footer: ReactNode }) {
  const titleId = useId();
  const { version } = offer;

  return (
    <li aria-labelledby={titleId} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
      <div className="flex min-w-48 flex-1 flex-col">
        <h3 id={titleId} className="text-sm font-medium">
          {offer.name}
        </h3>
        <p className="text-xs text-muted-foreground tabular-nums">
          {documentCostLabel(documentCostCents(version))}
          {offer.validityMonths !== null && ` · ${validityLabel(offer.validityMonths)}`}
        </p>
      </div>
      <p className="text-lg tabular-nums">{formatCents(version.totalCents)}</p>
      {footer}
    </li>
  );
}
