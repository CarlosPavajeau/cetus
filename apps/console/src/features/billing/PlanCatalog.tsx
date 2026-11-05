import { Link } from "@tanstack/react-router";
import { type ComponentProps, type ReactNode, useId } from "react";

import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import {
  documentCostCents,
  documentCostLabel,
  documentsLabel,
  formatCents,
  issuersLabel,
  monthlyEquivalentLabel,
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
 * `featuredCode` marks the plan most viewers should pick; `emptyNote` replaces the pointer to Ayuda, which needs a
 * session. `headingLevel` is the level of the plans' headings, one below the heading of the section around them.
 */
export function PlanCatalog({
  offers,
  period,
  onPeriodChange,
  renderAction,
  topupNote,
  featuredCode,
  emptyNote,
  headingLevel = 2,
}: {
  offers: PricedOffer[];
  period: CatalogPeriod;
  onPeriodChange: (period: CatalogPeriod) => void;
  renderAction: (offer: PricedOffer) => ReactNode;
  topupNote?: string;
  featuredCode?: string;
  emptyNote?: ReactNode;
  headingLevel?: HeadingLevel;
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
            <span className="font-medium text-foreground">
              Para negocios que facturan todos los meses y prefieren pagar mes a mes.
            </span>{" "}
            Pagas cada mes por adelantado. Si emites más documentos de los incluidos, sigues
            emitiendo y el excedente se cobra al cierre del mes.
          </p>
          <PlanColumns
            offers={subscriptions}
            renderAction={renderAction}
            featuredCode={featuredCode}
            emptyNote={emptyNote}
            headingLevel={headingLevel}
          />
        </div>
      </TabsContent>

      <TabsContent value="anual" className="mt-3">
        <div className="flex flex-col gap-4">
          <p className="max-w-prose text-md text-muted-foreground">
            <span className="font-medium text-foreground">
              Para quien factura por temporadas o lleva varias empresas y prefiere un solo pago al
              año.
            </span>{" "}
            Pagas una vez y usas los documentos durante la vigencia del paquete, compartidos entre
            todos tus emisores. Si se acaban, los amplías con una recarga.
          </p>
          <PlanColumns
            offers={packages}
            renderAction={renderAction}
            featuredCode={featuredCode}
            emptyNote={emptyNote}
            headingLevel={headingLevel}
          />
          {topups.length > 0 && (
            <TopupList
              offers={topups}
              renderAction={renderAction}
              note={topupNote}
              headingLevel={headingLevel}
            />
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function EmptyNote() {
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

function PlanColumns({
  offers,
  renderAction,
  featuredCode,
  emptyNote,
  headingLevel,
}: {
  offers: PricedOffer[];
  renderAction: (offer: PricedOffer) => ReactNode;
  featuredCode: string | undefined;
  emptyNote: ReactNode | undefined;
  headingLevel: HeadingLevel;
}) {
  if (offers.length === 0) {
    return emptyNote ?? <EmptyNote />;
  }
  const baseline = offers
    .filter((offer) => offer.kind === "SUBSCRIPTION")
    .map((offer) => ({ name: offer.name, cents: documentCostCents(offer.version) }))
    .reduce<CostBaseline | null>(
      (dearest, each) => (dearest === null || each.cents > dearest.cents ? each : dearest),
      null,
    );

  return (
    <div className="grid divide-y rounded-xl border bg-card lg:auto-cols-fr lg:grid-flow-col lg:grid-rows-[repeat(4,auto)] lg:divide-x lg:divide-y-0">
      {offers.map((offer) => (
        <PlanColumn
          key={offer.id}
          offer={offer}
          baseline={baseline}
          featured={offer.code === featuredCode}
          headingLevel={headingLevel}
          footer={renderAction(offer)}
        />
      ))}
    </div>
  );
}

type CostBaseline = { name: string; cents: number };

function PlanColumn({
  offer,
  baseline,
  featured,
  headingLevel,
  footer,
}: {
  offer: PricedOffer;
  baseline: CostBaseline | null;
  featured: boolean;
  headingLevel: HeadingLevel;
  footer: ReactNode;
}) {
  const titleId = useId();
  const { version } = offer;
  const period = pricePeriodLabel(offer);

  return (
    <article
      aria-labelledby={titleId}
      className="flex flex-col gap-5 p-5 lg:row-span-4 lg:grid lg:grid-rows-subgrid"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Heading level={headingLevel} id={titleId} className="text-md font-medium">
            {offer.name}
          </Heading>
          {featured && <Badge>Recomendado</Badge>}
        </div>
        <p className="tabular-nums">
          <span className="font-heading text-3xl tracking-tight">
            {formatCents(version.totalCents)}
          </span>
          {period !== null && <span className="text-sm text-muted-foreground"> {period}</span>}
        </p>
        <p className="text-xs text-muted-foreground">{priceBreakdown(version)}</p>
      </div>

      {offer.kind === "SUBSCRIPTION" && baseline !== null ? (
        <SubscriptionCost cents={documentCostCents(version)} baseline={baseline} />
      ) : (
        <PackageCost offer={offer} />
      )}

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

/** The plan's unit cost, and what a document saves against the dearest plan of its group. */
function SubscriptionCost({ cents, baseline }: { cents: number; baseline: CostBaseline }) {
  const savingPercent = Math.floor((1 - cents / baseline.cents) * 100);
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-sm tabular-nums">{documentCostLabel(cents)}</p>
      {savingPercent > 0 && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {savingPercent} % menos por documento que {baseline.name}
        </p>
      )}
    </div>
  );
}

/**
 * A package's unit cost falls with its size, so a bar would rank the smallest one last although it is the cheapest
 * way to start; its price per month compares it with the subscriptions instead.
 */
function PackageCost({ offer }: { offer: PricedOffer }) {
  const monthly = monthlyEquivalentLabel(offer);
  return (
    <div className="flex flex-col gap-0.5">
      {monthly !== null && <p className="text-sm tabular-nums">{monthly}</p>}
      <p className="text-xs text-muted-foreground tabular-nums">
        {documentCostLabel(documentCostCents(offer.version))}
      </p>
    </div>
  );
}

/** The catalog's shape while its prices load, so the page below it does not jump when they arrive. */
export function PlanCatalogSkeleton({ columns = 3 }: { columns?: number }) {
  return (
    <output aria-busy className="flex flex-col gap-4">
      <span className="sr-only">Cargando precios…</span>
      <Skeleton className="h-8 w-40" />
      <div className="flex max-w-prose flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid divide-y rounded-xl border bg-card lg:auto-cols-fr lg:grid-flow-col lg:divide-x lg:divide-y-0">
        {Array.from({ length: columns }, (_, index) => (
          <div key={index} className="flex flex-col gap-5 p-5">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-44" />
            </div>
            <Skeleton className="mt-1 h-9 w-40" />
          </div>
        ))}
      </div>
    </output>
  );
}

function TopupList({
  offers,
  renderAction,
  note,
  headingLevel,
}: {
  offers: PricedOffer[];
  renderAction: (offer: PricedOffer) => ReactNode;
  note: string | undefined;
  headingLevel: HeadingLevel;
}) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 pt-4">
      <div className="flex flex-col gap-1">
        <Heading level={headingLevel} id={titleId} className="text-md font-medium">
          Recargas
        </Heading>
        <p className="max-w-prose text-sm text-muted-foreground">
          Suman documentos a tu paquete anual. Cada recarga tiene su propia vigencia, contada desde
          la compra.
        </p>
        {note !== undefined && <p className="text-sm font-medium">{note}</p>}
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {offers.map((offer) => (
          <TopupRow
            key={offer.id}
            offer={offer}
            footer={renderAction(offer)}
            headingLevel={headingLevel}
          />
        ))}
      </ul>
    </section>
  );
}

function TopupRow({
  offer,
  footer,
  headingLevel,
}: {
  offer: PricedOffer;
  footer: ReactNode;
  headingLevel: HeadingLevel;
}) {
  const titleId = useId();
  const { version } = offer;

  return (
    <li aria-labelledby={titleId} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
      <div className="flex min-w-48 flex-1 flex-col">
        <Heading level={headingLevel === 2 ? 3 : 4} id={titleId} className="text-sm font-medium">
          {offer.name}
        </Heading>
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

type HeadingLevel = 2 | 3;

function Heading({
  level,
  children,
  ...props
}: { level: 2 | 3 | 4; children: ReactNode } & Omit<ComponentProps<"h2">, "children">) {
  if (level === 2) {
    return <h2 {...props}>{children}</h2>;
  }
  if (level === 3) {
    return <h3 {...props}>{children}</h3>;
  }
  return <h4 {...props}>{children}</h4>;
}
