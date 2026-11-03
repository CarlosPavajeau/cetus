import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { FaqSection } from "~/features/marketing/Faq";
import { capLabel } from "~/features/marketing/obligation";
import { ObligationCalculator } from "~/features/marketing/ObligationCalculator";
import { landingFiguresQuery } from "~/features/marketing/queries";
import { type FaqItem, faqJsonLd } from "~/features/marketing/questions";
import { Section } from "~/features/marketing/Section";
import { marketingCacheControl, marketingHead } from "~/features/marketing/seo";
import { docsUrl } from "~/lib/docs";

const calculatorFaq: readonly FaqItem[] = [
  {
    question: "¿Quiénes están obligados a facturar electrónicamente?",
    answer:
      "Las personas jurídicas, las personas naturales responsables de IVA y quienes están en el régimen SIMPLE. Una persona natural no responsable de IVA no está obligada mientras cumpla todas las condiciones, como tener ingresos menores a 3.500 UVT y un solo establecimiento.",
  },
  {
    question: "¿Qué es la UVT?",
    answer:
      "La Unidad de Valor Tributario es la medida con la que la DIAN fija topes y sanciones. Los topes en UVT se mantienen; su valor en pesos cambia cada año.",
  },
  {
    question: "Si no estoy obligado, ¿puedo facturar electrónicamente?",
    answer:
      "Sí. Puedes hacerlo de forma voluntaria, por ejemplo si tus clientes te piden factura electrónica para soportar sus costos.",
  },
  {
    question: "¿Qué necesito para empezar?",
    answer:
      "Tu RUT con la responsabilidad de facturador electrónico, un certificado de firma digital y una resolución de numeración de la DIAN. En Cetus empiezas gratis en simulación mientras reúnes lo demás.",
  },
];

const path = "/estoy-obligado-a-facturar";

export const Route = createFileRoute("/_marketing/estoy-obligado-a-facturar")({
  loader: async ({ context }) => {
    const figures = await context.queryClient.query(landingFiguresQuery).catch(() => undefined);
    return { figuresLoaded: figures !== undefined };
  },
  head: () => ({
    ...marketingHead({
      path,
      title: "¿Estoy obligado a facturar electrónicamente? · Cetus",
      description:
        "Responde cuatro preguntas y sabe si debes expedir factura electrónica ante la DIAN como persona natural o jurídica. Gratis y sin registrarte.",
    }),
    scripts: [{ type: "application/ld+json", children: faqJsonLd(calculatorFaq) }],
  }),
  headers: ({ loaderData }) =>
    loaderData?.figuresLoaded ? { "Cache-Control": marketingCacheControl } : undefined,
  component: ObligationPage,
});

function ObligationPage() {
  const { data: figures } = useQuery(landingFiguresQuery);
  const cap = figures?.obligationCap ?? null;
  const capText = capLabel(cap);

  return (
    <>
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-16 pb-section md:px-6 md:pt-24">
        <div className="flex max-w-2xl flex-col gap-4">
          <h1 className="font-heading text-5xl font-medium tracking-display text-balance md:text-6xl">
            ¿Estoy obligado a facturar electrónicamente?
          </h1>
          <p className="text-lg/8 text-pretty text-muted-foreground">
            Responde unas preguntas y sal de dudas. Gratis y sin registrarte.
          </p>
        </div>
        <ObligationCalculator cap={cap} />
      </section>
      <Section
        eyebrow="Las reglas"
        title="Cómo lo calculamos"
        lead="Aplicamos las reglas generales de la DIAN. Tu caso puede tener detalles que solo tu contador ve, así que tómalo como una guía."
      >
        <ul className="grid max-w-3xl gap-4 text-md/7 text-pretty">
          <li>
            <strong className="font-medium">Personas jurídicas:</strong> siempre deben facturar
            electrónicamente.
          </li>
          <li>
            <strong className="font-medium">Régimen SIMPLE:</strong> quienes están inscritos deben
            facturar electrónicamente.
          </li>
          <li>
            <strong className="font-medium">Personas naturales:</strong> no están obligadas mientras
            no sean responsables de IVA, lo que exige cumplir todo a la vez: ingresos brutos menores
            a {capText} el año pasado y este; como máximo un establecimiento; sin franquicias,
            concesiones ni operaciones como usuario aduanero; y contratos y consignaciones del año
            por debajo del mismo tope.
          </li>
          <li>
            <a
              href={`${docsUrl}/guias/como-habilitarse`}
              className="font-medium underline underline-offset-4"
            >
              Cómo habilitarte como facturador electrónico
            </a>
          </li>
        </ul>
      </Section>
      <FaqSection items={calculatorFaq} />
    </>
  );
}
