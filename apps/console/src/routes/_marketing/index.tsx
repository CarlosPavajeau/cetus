import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { FaqSection } from "~/features/marketing/Faq";
import { FinalCta } from "~/features/marketing/FinalCta";
import { Hero } from "~/features/marketing/Hero";
import { IntegrationsSection } from "~/features/marketing/Integrations";
import { type Audience, parseAudience } from "~/features/marketing/links";
import { PartnersNote, PricingPromises, PricingTable } from "~/features/marketing/Pricing";
import {
  landingFiguresQuery,
  marketingConfigQuery,
  publicPlansQuery,
  snippetsQuery,
} from "~/features/marketing/queries";
import { faqJsonLd, landingFaq } from "~/features/marketing/questions";
import { RequestDemo } from "~/features/marketing/RequestDemo";
import { Section } from "~/features/marketing/Section";
import {
  BusinessSection,
  CalculatorSection,
  FeaturesSection,
  SecuritySection,
  StepsSection,
  WebhooksSection,
} from "~/features/marketing/Sections";
import { marketingCacheControl, marketingHead } from "~/features/marketing/seo";
import { TrustBand } from "~/features/marketing/TrustBand";
import { docsUrl } from "~/lib/docs";

const screenshots = {
  accepted: `${docsUrl}/images/consola/factura-aceptada.png`,
  form: `${docsUrl}/images/consola/factura-precargada.png`,
};

/** `audience`: the view a link opens with, e.g. an ad for businesses. */
export const Route = createFileRoute("/_marketing/")({
  validateSearch: (search: Record<string, unknown>): { audience?: Audience } => {
    const audience = parseAudience(search.audience);
    return audience ? { audience } : {};
  },
  loader: async ({ context }) => {
    const [, offers] = await Promise.all([
      context.queryClient.query({ ...snippetsQuery, staleTime: "static" }),
      context.queryClient.query(publicPlansQuery).catch(() => undefined),
      context.queryClient.query(landingFiguresQuery).catch(() => undefined),
    ]);
    return { pricesLoaded: offers !== undefined };
  },
  head: () => ({
    ...marketingHead({
      path: "/",
      title: "Cetus · API de facturación electrónica para Colombia",
      description:
        "Facturas, notas crédito y notas débito generadas, firmadas y validadas por la DIAN con una sola llamada. Empieza gratis en simulación.",
    }),
    scripts: [{ type: "application/ld+json", children: faqJsonLd(landingFaq) }],
  }),
  headers: ({ loaderData }) =>
    loaderData?.pricesLoaded ? { "Cache-Control": marketingCacheControl } : undefined,
  component: Landing,
});

function Landing() {
  const { audience = "dev" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: html } = useSuspenseQuery(snippetsQuery);
  const { data: config } = useQuery(marketingConfigQuery);
  const whatsappNumber = config?.whatsappNumber ?? null;

  function changeAudience(next: Audience) {
    void navigate({
      search: next === "dev" ? {} : { audience: next },
      replace: true,
      resetScroll: false,
    });
  }

  return (
    <>
      <Hero
        audience={audience}
        onAudienceChange={changeAudience}
        heroCurlHtml={html.heroCurl}
        whatsappNumber={whatsappNumber}
        consoleScreenshotUrl={screenshots.accepted}
      />
      {audience === "dev" ? (
        <>
          <Section
            eyebrow="De la petición al CUFE"
            title="De tu pedido a la DIAN, sin tocar XML"
            lead="Una llamada a la API. Cetus genera el XML, lo firma, lo envía a la DIAN y te avisa con un webhook cuando lo acepta."
          >
            <RequestDemo webhookPayloadHtml={html.webhookPayload} />
          </Section>
          <TrustBand />
          <FeaturesSection />
          <StepsSection html={html} />
          <WebhooksSection verifyHtml={html.webhookVerify} />
          <IntegrationsSection />
          <BusinessSection whatsappNumber={whatsappNumber} screenshotUrl={screenshots.form} />
          <CalculatorSection />
        </>
      ) : (
        <>
          <BusinessSection
            whatsappNumber={whatsappNumber}
            screenshotUrl={screenshots.form}
            afterHero
          />
          <CalculatorSection />
          <TrustBand />
          <FeaturesSection />
          <IntegrationsSection />
        </>
      )}
      <Section
        id="precios"
        eyebrow="Precios"
        title="Precios claros, sin hablar con ventas"
        lead="Empiezas gratis en simulación y en pruebas. Para emitir en producción eliges una suscripción mensual o un paquete anual."
      >
        <PricingTable audience={audience} page="landing" headingLevel={3} />
        <PartnersNote />
        <PricingPromises />
      </Section>
      <SecuritySection />
      <FaqSection items={landingFaq} />
      <FinalCta
        audience={audience}
        onAudienceChange={changeAudience}
        whatsappNumber={whatsappNumber}
      />
    </>
  );
}
