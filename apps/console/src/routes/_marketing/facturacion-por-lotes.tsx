import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { DownloadIcon } from "lucide-react";

import { templatePath } from "~/features/batches/columns";
import { linesMax, referencesMax } from "~/features/batches/parse";
import { fileBytesMax } from "~/features/batches/readBatchFile";
import { track } from "~/features/marketing/analytics";
import { ConsoleCta } from "~/features/marketing/ConsoleCta";
import { FaqSection } from "~/features/marketing/Faq";
import { FinalCta } from "~/features/marketing/FinalCta";
import { linkButtonVariants } from "~/features/marketing/linkButton";
import { CourtesyNote } from "~/features/marketing/Pricing";
import { landingFiguresQuery, marketingConfigQuery } from "~/features/marketing/queries";
import { type FaqItem, faqJsonLd } from "~/features/marketing/questions";
import { Section } from "~/features/marketing/Section";
import { marketingCacheControl, marketingHead } from "~/features/marketing/seo";
import { formatCount } from "~/features/usage/labels";
import { docsUrl } from "~/lib/docs";

const fileMegabytes = fileBytesMax / (1024 * 1024);

const steps = [
  {
    title: "Descarga la plantilla",
    text: "Un Excel con una fila por línea de factura y listas desplegables para los códigos de la DIAN. Si tus ventas salen de otro sistema, sirve un CSV con las mismas columnas.",
  },
  {
    title: "Llénala con tus ventas",
    text: "Las filas con la misma referencia forman una factura. Si el cliente o el producto ya están guardados en Cetus, basta con su identificación o su código.",
  },
  {
    title: "Súbela y sigue el lote",
    text: "Antes de enviar ves cada error con su fila y su columna. Al confirmar, Cetus numera, firma y envía cada factura a la DIAN, y te avisa por correo cuando termina.",
  },
] as const;

const batchesFaq: readonly FaqItem[] = [
  {
    question: "¿Cuántas facturas puedo subir en un lote?",
    answer: `Hasta ${formatCount(referencesMax)} facturas por archivo, de hasta ${fileMegabytes} MB, con hasta ${formatCount(linesMax)} líneas cada una. Si tienes más, las divides en varios lotes.`,
  },
  {
    question: "¿Qué pasa si una fila tiene un error?",
    answer:
      "Lo ves antes de enviar, con su fila y su columna. Corriges el archivo y lo subes de nuevo, o excluyes las facturas con errores y emites las demás. Ninguna factura con errores toma un número.",
  },
  {
    question: "¿Qué pasa si se me acaban los documentos a mitad del lote?",
    answer:
      "Las facturas creadas siguen su curso y las que faltaban no se numeran. El resultado dice cuáles son, para que las envíes en otro lote cuando amplíes tu plan.",
  },
  {
    question: "¿Puedo probarlo sin pagar?",
    answer:
      "Sí. En simulación subes la plantilla con la empresa de ejemplo y ves el lote completo, sin certificado ni tarjeta. Esas facturas no se envían a la DIAN.",
  },
  {
    question: "¿Puedo enviar lotes desde mi sistema, sin la consola?",
    answer:
      "Todavía no. Hoy los lotes se suben desde la consola; para facturar desde tu sistema, la API emite cada factura con una llamada.",
  },
];

export const Route = createFileRoute("/_marketing/facturacion-por-lotes")({
  loader: async ({ context }) => {
    const figures = await context.queryClient.query(landingFiguresQuery).catch(() => undefined);
    return { figuresLoaded: figures !== undefined };
  },
  head: () => ({
    ...marketingHead({
      path: "/facturacion-por-lotes",
      title: "Facturación electrónica por lotes desde Excel · Cetus",
      description: `Sube un Excel y emite hasta ${formatCount(referencesMax)} facturas electrónicas a la DIAN de una vez. Revisas los errores antes de enviar y sigues cada factura hasta su aceptación.`,
    }),
    scripts: [{ type: "application/ld+json", children: faqJsonLd(batchesFaq) }],
  }),
  headers: ({ loaderData }) =>
    loaderData?.figuresLoaded ? { "Cache-Control": marketingCacheControl } : undefined,
  component: Batches,
});

function TemplateDownload({ variant }: { variant: "default" | "outline" }) {
  return (
    <a
      href={templatePath}
      download
      className={linkButtonVariants({ variant, size: "lg" })}
      onClick={() => track({ name: "template_download", page: "batches" })}
    >
      <DownloadIcon data-icon="inline-start" />
      Descargar la plantilla
    </a>
  );
}

function Batches() {
  const { data: config } = useQuery(marketingConfigQuery);
  return (
    <>
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pt-16 pb-section md:px-6 md:pt-24">
        <div className="flex max-w-2xl flex-col gap-4">
          <h1 className="font-heading text-display font-medium tracking-display text-balance">
            Sube un Excel, emite cientos de facturas
          </h1>
          <p className="text-lg/8 text-pretty text-muted-foreground">
            Arriendos, suscripciones, el cierre de mes: llena la plantilla con tus ventas y Cetus
            emite cada factura electrónica ante la DIAN, con su PDF por correo para tu cliente.
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <ConsoleCta audience="negocio" section="batches" label="Crear cuenta gratis" />
            <TemplateDownload variant="outline" />
          </div>
          <p className="text-sm text-muted-foreground">
            Pruébalo en simulación con una empresa de ejemplo, sin certificado ni tarjeta.
          </p>
        </div>
        <CourtesyNote />
        <img
          src={`${docsUrl}/images/consola/lote-terminado.png`}
          alt="Un lote terminado en la consola de Cetus: el avance, las facturas aceptadas y cada factura con su número y estado"
          width={1280}
          height={800}
          className="w-full rounded-xl shadow-sm outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10 dark:brightness-90"
        />
      </section>
      <Section
        eyebrow="Cómo funciona"
        title="De tu hoja de cálculo a la DIAN en tres pasos"
        lead="El archivo se lee en tu navegador: nada se envía hasta que confirmas."
      >
        <ol className="grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-2 bg-background p-6">
              <span className="font-mono text-sm text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <h3 className="text-md font-medium">{step.title}</h3>
              <p className="text-md/6 text-pretty text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <TemplateDownload variant="default" />
          <a
            href={`${docsUrl}/guias/emitir-desde-excel`}
            className="text-md font-medium underline underline-offset-4"
          >
            Leer la guía completa
          </a>
        </div>
      </Section>
      <FaqSection items={batchesFaq} />
      <FinalCta audience="negocio" whatsappNumber={config?.whatsappNumber ?? null} />
    </>
  );
}
