import { createFileRoute } from "@tanstack/react-router";

import { FaqSection } from "~/features/marketing/Faq";
import { PartnersNote, PricingPromises, PricingTable } from "~/features/marketing/Pricing";
import { publicPlansQuery } from "~/features/marketing/queries";
import { type FaqItem, faqJsonLd } from "~/features/marketing/questions";
import { marketingCacheControl, marketingHead, siteUrl } from "~/features/marketing/seo";

const pricingFaq: readonly FaqItem[] = [
  {
    question: "¿Puedo probar antes de pagar?",
    answer:
      "Sí. La simulación y las pruebas de habilitación ante la DIAN son gratis y no vencen. Solo pagas cuando emites en producción.",
  },
  {
    question: "¿Cuál es la diferencia entre una suscripción y un paquete anual?",
    answer:
      "La suscripción se paga cada mes, trae documentos para ese mes y, si se acaban, sigues emitiendo con excedente. El paquete anual se paga una vez, sus documentos duran 12 meses y se amplía con recargas.",
  },
  {
    question: "¿Qué pasa con los documentos que no uso en el mes?",
    answer:
      "Siguen vigentes hasta 60 días después de que termina el periodo, sin pasar de dos mensualidades de documentos acumulados.",
  },
  {
    question: "¿Puedo cambiar de plan?",
    answer:
      "Sí, desde la consola. El cambio y la cancelación aplican desde el siguiente periodo, sin prorrateo.",
  },
  {
    question: "¿Cómo pago?",
    answer:
      "En la consola, con Wompi. Puedes guardar una tarjeta para que cada renovación se cobre sola. Cada compra se factura electrónicamente con Cetus.",
  },
];

export const Route = createFileRoute("/_marketing/precios")({
  loader: async ({ context }) => {
    const offers = await context.queryClient.query(publicPlansQuery).catch(() => undefined);
    return { pricesLoaded: offers !== undefined, offerJsonLd: offers && offersJsonLd(offers) };
  },
  head: ({ loaderData }) => ({
    ...marketingHead({
      path: "/precios",
      title: "Precios · Cetus",
      description:
        "Suscripciones mensuales desde 200 documentos y paquetes anuales para facturar electrónicamente con la DIAN. Simulación y habilitación gratis.",
    }),
    scripts: [
      { type: "application/ld+json", children: faqJsonLd(pricingFaq) },
      ...(loaderData?.offerJsonLd
        ? [{ type: "application/ld+json", children: loaderData.offerJsonLd }]
        : []),
    ],
  }),
  headers: ({ loaderData }) =>
    loaderData?.pricesLoaded ? { "Cache-Control": marketingCacheControl } : undefined,
  component: Pricing,
});

/** schema.org SoftwareApplication with one Offer per priced plan, in pesos. */
function offersJsonLd(offers: { name: string; version: { totalCents: number } | null }[]) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cetus",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteUrl,
    offers: offers.flatMap((offer) =>
      offer.version !== null && offer.version.totalCents > 0
        ? [
            {
              "@type": "Offer",
              name: offer.name,
              price: (offer.version.totalCents / 100).toFixed(0),
              priceCurrency: "COP",
            },
          ]
        : [],
    ),
  });
}

function Pricing() {
  return (
    <>
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-16 pb-section md:px-6 md:pt-24">
        <div className="flex max-w-2xl flex-col gap-4">
          <h1 className="font-heading text-5xl font-medium tracking-display text-balance md:text-6xl">
            Precios claros, sin hablar con ventas
          </h1>
          <p className="text-lg/8 text-pretty text-muted-foreground">
            Empiezas gratis en simulación y en pruebas. Para emitir en producción eliges una
            suscripción mensual o un paquete anual.
          </p>
        </div>
        <PricingTable headingLevel={2} />
        <PartnersNote />
        <PricingPromises />
      </section>
      <FaqSection items={pricingFaq} />
    </>
  );
}
