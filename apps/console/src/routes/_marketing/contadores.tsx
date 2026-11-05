import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Building2Icon, FileStackIcon, LinkIcon, UsersIcon } from "lucide-react";

import {
  type PricedOffer,
  documentsLabel,
  formatCents,
  issuersLabel,
  overageLabel,
  pricePeriodLabel,
  priced,
  validityLabel,
} from "~/features/billing/labels";
import { ConsoleCta } from "~/features/marketing/ConsoleCta";
import { FaqSection } from "~/features/marketing/Faq";
import { PartnerForm } from "~/features/marketing/PartnerForm";
import { publicPlansQuery } from "~/features/marketing/queries";
import { type FaqItem, faqJsonLd } from "~/features/marketing/questions";
import { Section } from "~/features/marketing/Section";
import { marketingCacheControl, marketingHead } from "~/features/marketing/seo";
import type { PlanOffer } from "~/lib/api/types";
import { docsUrl } from "~/lib/docs";

/** The plans a firm with several clients compares: those that include three issuers or more. */
const ISSUERS_MIN = 3;

const benefits = [
  {
    icon: Building2Icon,
    title: "Un emisor por cliente",
    text: "Cada empresa queda con su NIT, su certificado de firma y su resolución de numeración, separada de las demás.",
  },
  {
    icon: FileStackIcon,
    title: "Una sola bolsa de documentos",
    text: "Los documentos del plan se comparten entre todos tus emisores: no compras un plan por cliente.",
  },
  {
    icon: LinkIcon,
    title: "El certificado, con un enlace",
    text: "Envía a tu cliente un enlace de un solo uso para que suba su certificado, sin crear una cuenta.",
  },
  {
    icon: UsersIcon,
    title: "Tu equipo, con sus roles",
    text: "Invita a tus auxiliares a la organización y decide quién administra y quién solo factura.",
  },
] as const;

const partnersFaq: readonly FaqItem[] = [
  {
    question: "¿Cada cliente necesita su propio certificado?",
    answer:
      "Sí. La DIAN exige que cada emisor firme con un certificado a su nombre. Cetus lo guarda cifrado y nadie del equipo puede descargarlo.",
  },
  {
    question: "¿Qué pasa si manejo más empresas de las que incluye el plan?",
    answer:
      "No se desactiva ningún emisor: solo se bloquea crear nuevos hasta que cambies de plan. Si manejas muchas empresas, el plan Socios se ajusta a tu cartera.",
  },
  {
    question: "¿Puedo emitir desde la consola sin programar?",
    answer:
      "Sí. Desde la consola emites facturas, notas crédito y notas débito de cada cliente con un formulario. La API queda disponible si algún cliente quiere facturar desde su sistema.",
  },
];

export const Route = createFileRoute("/_marketing/contadores")({
  loader: async ({ context }) => {
    const offers = await context.queryClient.query(publicPlansQuery).catch(() => undefined);
    return { pricesLoaded: offers !== undefined };
  },
  head: () => ({
    ...marketingHead({
      path: "/contadores",
      title: "Para contadores · Cetus",
      description:
        "Factura electrónica para todas las empresas de tus clientes desde una sola cuenta: un emisor por cliente, una bolsa de documentos compartida y el plan Socios a tu medida.",
    }),
    scripts: [{ type: "application/ld+json", children: faqJsonLd(partnersFaq) }],
  }),
  headers: ({ loaderData }) =>
    loaderData?.pricesLoaded ? { "Cache-Control": marketingCacheControl } : undefined,
  component: Partners,
});

function Partners() {
  return (
    <>
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-16 pb-section md:px-6 md:pt-24">
        <div className="flex max-w-2xl flex-col gap-4">
          <h1 className="font-heading text-display font-medium tracking-display text-balance">
            Las empresas de tus clientes, en una sola cuenta
          </h1>
          <p className="text-lg/8 text-pretty text-muted-foreground">
            Cada cliente es un emisor con su NIT, su certificado y su numeración. Tú los habilitas
            ante la DIAN y facturas por ellos desde la misma consola.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <div>
              <ConsoleCta audience="negocio" section="partners" label="Crear cuenta gratis" />
            </div>
            <p className="text-sm text-muted-foreground">
              Empiezas en simulación con una empresa de ejemplo, sin certificado ni tarjeta.
            </p>
          </div>
        </div>
        <img
          src={`${docsUrl}/images/consola/emisores-varios.png`}
          alt="La lista de emisores de una cuenta en la consola de Cetus: tres empresas en producción, una en habilitación y la empresa de ejemplo, cada una con su NIT"
          width={1280}
          height={640}
          className="w-full rounded-xl shadow-sm outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10 dark:brightness-90"
        />
        <ul
          aria-label="Lo que ganas con Cetus"
          className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2"
        >
          {benefits.map((benefit) => (
            <li key={benefit.title} className="flex flex-col gap-2 bg-background p-6">
              <benefit.icon className="size-5 text-muted-foreground" />
              <h2 className="text-md font-medium">{benefit.title}</h2>
              <p className="text-md/6 text-pretty text-muted-foreground">{benefit.text}</p>
            </li>
          ))}
        </ul>
      </section>
      <Section
        id="planes"
        eyebrow="Planes"
        title="Planes para varias empresas"
        lead="Precios del catálogo de hoy. Los documentos se comparten entre los emisores de la cuenta."
      >
        <MultiIssuerPlans />
      </Section>
      <IssuerTiersSection />
      <Section
        id="socios"
        eyebrow="Plan Socios"
        title="¿Manejas muchas empresas?"
        lead="Si tu cartera pasa de los emisores de estos planes, el plan Socios ajusta los documentos y los emisores a tu medida, por contrato. Cuéntanos de tu firma y te escribimos."
      >
        <div className="max-w-2xl">
          <PartnerForm />
        </div>
      </Section>
      <FaqSection items={partnersFaq} />
    </>
  );
}

function multiIssuerPlans(offers: readonly PlanOffer[]) {
  return offers
    .filter(priced)
    .filter(
      (offer) => offer.kind !== "TOPUP" && (offer.version.issuersIncluded ?? 0) >= ISSUERS_MIN,
    );
}

function PricesUnavailable() {
  return (
    <p className="text-sm text-muted-foreground">
      No pudimos cargar los precios. Míralos en{" "}
      <Link to="/precios" className="underline underline-offset-3 hover:text-foreground">
        la página de precios
      </Link>
      .
    </p>
  );
}

function MultiIssuerPlans() {
  const { data: offers, isError } = useQuery(publicPlansQuery);
  if (isError) {
    return <PricesUnavailable />;
  }
  const plans = multiIssuerPlans(offers ?? []);
  if (plans.length === 0) {
    return null;
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((offer) => (
        <PlanCard key={offer.id} offer={offer} />
      ))}
    </ul>
  );
}

function PlanCard({ offer }: { offer: PricedOffer }) {
  const period = pricePeriodLabel(offer);
  return (
    <li>
      <article aria-label={offer.name} className="flex h-full flex-col gap-3 rounded-xl border p-6">
        <h3 className="text-md font-medium">{offer.name}</h3>
        <p className="tabular-nums">
          <span className="font-heading text-3xl tracking-tight">
            {formatCents(offer.version.totalCents)}
          </span>
          {period && <span className="text-sm text-muted-foreground"> {period}</span>}
        </p>
        <ul className="flex flex-col gap-1 text-md/6 text-muted-foreground">
          <li>
            {documentsLabel(offer.version.documentsIncluded)}
            {offer.kind === "SUBSCRIPTION" ? " cada mes" : " en total"}
          </li>
          {offer.version.priceOverageCents !== null && (
            <li>{overageLabel(offer.version.priceOverageCents)}</li>
          )}
          {offer.kind === "PACKAGE" && <li>Si se acaban, los amplías con una recarga</li>}
          {offer.version.issuersIncluded !== null &&
            offer.version.issuersIncluded !== undefined && (
              <li>{issuersLabel(offer.version.issuersIncluded)}</li>
            )}
          {offer.validityMonths !== null && <li>{validityLabel(offer.validityMonths)}</li>}
        </ul>
        <div className="mt-auto pt-3">
          <ConsoleCta
            audience="negocio"
            section="partners"
            label="Crear cuenta gratis"
            size="default"
            variant="outline"
            plan={offer.code}
            signedIn={{
              to: "/billing/products",
              label: "Contratar en la consola",
              periodo: offer.kind === "SUBSCRIPTION" ? "mensual" : "anual",
            }}
          />
        </div>
      </article>
    </li>
  );
}

/** The plans that include the same number of production issuers: "hasta 3 clientes", "de 4 a 10". */
type IssuerTier = { from: number; to: number; offers: readonly PricedOffer[] };

function issuerTiers(plans: readonly PricedOffer[]): IssuerTier[] {
  const sizes = [...new Set(plans.map((offer) => offer.version.issuersIncluded ?? 0))].toSorted(
    (a, b) => a - b,
  );
  return sizes.map((size, index) => ({
    from: (sizes[index - 1] ?? 0) + 1,
    to: size,
    offers: plans
      .filter((offer) => offer.version.issuersIncluded === size)
      .toSorted((a, b) => Number(b.kind === "SUBSCRIPTION") - Number(a.kind === "SUBSCRIPTION")),
  }));
}

const orList = new Intl.ListFormat("es", { type: "disjunction" });

function tierRange({ from, to }: IssuerTier) {
  return from === 1 ? `Hasta ${to} clientes` : `De ${from} a ${to} clientes`;
}

function priceLabel(offer: PricedOffer) {
  const period = pricePeriodLabel(offer);
  return period
    ? `${formatCents(offer.version.totalCents)} ${period}`
    : formatCents(offer.version.totalCents);
}

function IssuerTiersSection() {
  const { data: offers, isError } = useQuery(publicPlansQuery);
  const tiers = issuerTiers(multiIssuerPlans(offers ?? []));
  const [first, second] = tiers;
  const last = tiers.at(-1);
  if (isError || first === undefined || second === undefined || last === undefined) {
    return null;
  }
  const next = first.to + 1;
  const upgrades = second.offers.filter((offer) => offer.kind === "SUBSCRIPTION");
  const packages = first.offers.filter((offer) => offer.kind === "PACKAGE");
  return (
    <Section
      title={`¿Cuánto cuesta el cliente número ${next}?`}
      lead="No pagas por cliente: pagas por el plan, que incluye un número de emisores en producción. Habilitar a un cliente en pruebas no cuesta nada."
    >
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-5">
        <dl className="grid gap-px overflow-hidden rounded-xl border bg-border lg:col-span-3">
          {tiers.map((tier) => (
            <div
              key={tier.to}
              className="grid gap-2 bg-background p-5 sm:grid-cols-[10rem_1fr] sm:gap-6"
            >
              <dt className="text-base font-medium">{tierRange(tier)}</dt>
              <dd className="flex flex-col gap-1 text-md/6">
                {tier.offers.map((offer) => (
                  <span key={offer.id}>
                    {offer.name}{" "}
                    <span className="text-muted-foreground">· {priceLabel(offer)}</span>
                  </span>
                ))}
              </dd>
            </div>
          ))}
          <div className="grid gap-2 bg-background p-5 sm:grid-cols-[10rem_1fr] sm:gap-6">
            <dt className="text-base font-medium">Más de {last.to} clientes</dt>
            <dd className="text-md/6">
              Socios <span className="text-muted-foreground">· por contrato</span>
            </dd>
          </div>
        </dl>
        <div className="flex flex-col gap-4 text-md/6 text-pretty lg:col-span-2">
          <p>
            El cliente número {next} no se cobra aparte. Con{" "}
            {orList.format(first.offers.map((offer) => offer.name))} tienes {first.to} emisores en
            producción; para el {next}.º cambias a{" "}
            {orList.format(upgrades.map((offer) => `${offer.name} (${priceLabel(offer)})`))}, que
            incluye hasta {second.to}. Mientras lo habilitas, ese cliente queda en pruebas, sin
            costo.
          </p>
          {packages.length > 0 && (
            <p className="text-muted-foreground">
              Si tienes el paquete {orList.format(packages.map((offer) => offer.name))}, al cambiar
              a una suscripción conservas los documentos del paquete hasta su vencimiento.
            </p>
          )}
          <p className="text-muted-foreground">
            El plan Socios tiene sentido cuando pasas de {last.to} empresas o cuando tu volumen pide
            otro precio por documento: los emisores, los documentos y el precio se acuerdan por
            contrato.{" "}
            <Link
              to="/contadores"
              hash="socios"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Hablar del plan Socios
            </Link>
          </p>
        </div>
      </div>
    </Section>
  );
}
