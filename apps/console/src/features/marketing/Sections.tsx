import { Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  BellRingIcon,
  FileCheck2Icon,
  FileMinusIcon,
  FlaskConicalIcon,
  HashIcon,
  KeyRoundIcon,
  type LucideIcon,
  MailIcon,
  QrCodeIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { statusPageUrl } from "~/features/status/links";
import { docsUrl } from "~/lib/docs";

import { CodeBlock } from "./CodeBlock";
import { ConsoleCta } from "./ConsoleCta";
import { linkButtonVariants } from "./linkButton";
import { Section } from "./Section";
import type { SnippetName } from "./snippets";
import { WhatsAppButton } from "./WhatsAppButton";

type Feature = { icon: LucideIcon; title: string; text: string };

const features: readonly Feature[] = [
  {
    icon: FileCheck2Icon,
    title: "Factura electrónica de venta",
    text: "UBL 2.1 con totales, impuestos y CUFE calculados por Cetus a partir de tus líneas.",
  },
  {
    icon: FileMinusIcon,
    title: "Notas crédito y débito",
    text: "Corrige o ajusta una factura con su CUDE. Las notas crédito se emiten siempre, aunque no tengas saldo.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Firma XAdES-EPES",
    text: "Firmamos con tu certificado digital, que se guarda cifrado con AWS KMS y nunca en texto plano.",
  },
  {
    icon: QrCodeIcon,
    title: "PDF con CUFE y QR",
    text: "La representación gráfica, lista para descargar o enviar, junto al XML firmado y el AttachedDocument.",
  },
  {
    icon: HashIcon,
    title: "Numeración y resoluciones",
    text: "Cetus numera cada documento con tu resolución vigente, sin huecos ni duplicados.",
  },
  {
    icon: MailIcon,
    title: "Entrega al cliente",
    text: "Cuando la DIAN acepta el documento, le llega a tu cliente por correo con el PDF y el AttachedDocument.",
  },
  {
    icon: FlaskConicalIcon,
    title: "Simulación idéntica a producción",
    text: "Integra sin certificado ni habilitación: la simulación responde como la DIAN, sin validez fiscal.",
  },
  {
    icon: BellRingIcon,
    title: "Webhooks",
    text: "Tu sistema se entera al instante de cada aceptación, rechazo o entrega; sin consultar el estado.",
  },
];

export function FeaturesSection() {
  return (
    <Section
      eyebrow="Cobertura"
      title="Todo lo que la DIAN exige, resuelto"
      lead="Tú envías el pedido en JSON. Cetus lo convierte en un documento electrónico válido y se encarga del resto."
    >
      <ul className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex flex-col gap-2 bg-background p-5">
            <Icon className="size-5 text-muted-foreground" />
            <h3 className="text-base font-medium">{title}</h3>
            <p className="text-md/6 text-pretty text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

type CodeTab = { value: string; label: string; snippet: SnippetName };

const codeTabs: readonly CodeTab[] = [
  { value: "curl", label: "cURL", snippet: "invoiceCurl" },
  { value: "js", label: "JavaScript", snippet: "invoiceJs" },
  { value: "python", label: "Python", snippet: "invoicePython" },
];

const steps = [
  {
    title: "Crea tu cuenta y tu llave de simulación",
    text: "Toda cuenta nueva trae una empresa de ejemplo lista para emitir. Crea una llave cetus_sandbox_ en la consola.",
  },
  {
    title: "Emite tu primera factura",
    text: "Envía el pedido a POST /v1/invoices. Cetus responde 202 con la factura numerada y te avisa por webhook.",
  },
  {
    title: "Configura tu empresa ante la DIAN",
    text: "Registra tu emisor, sube tu certificado y envía el set de pruebas desde la consola, en unos 20 minutos.",
  },
  {
    title: "Pasa a producción",
    text: "La misma integración, con tu llave de producción. Solo cambia la llave.",
  },
] as const;

export function StepsSection({ html }: { html: Record<SnippetName, string> }) {
  const [tab, setTab] = useState("curl");

  return (
    <Section
      eyebrow="Cómo empezar"
      title="Primero pruebas. Después, producción."
      lead="La habilitación ante la DIAN deja de ser un proyecto: la haces cuando tu integración ya funciona."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ol className="flex flex-col gap-6">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs">
                {index + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-medium">{step.title}</h3>
                <p className="text-md/6 text-pretty text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <Tabs value={tab} onValueChange={(value) => setTab(String(value))} className="min-w-0">
          <TabsList aria-label="Lenguaje">
            {codeTabs.map((each) => (
              <TabsTrigger key={each.value} value={each.value}>
                {each.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {codeTabs.map((each) => (
            <TabsContent key={each.value} value={each.value} className="min-w-0">
              <CodeBlock
                html={html[each.snippet]}
                snippet={each.snippet}
                title={`POST /v1/invoices · ${each.label}`}
                copyLabel={`Copiar el ejemplo en ${each.label}`}
                lineNumbers
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Section>
  );
}

const events = [
  { name: "invoice.accepted", text: "La DIAN aceptó la factura: ya tiene validez fiscal." },
  { name: "invoice.rejected", text: "La DIAN la rechazó; el evento trae sus errores." },
  { name: "credit_note.accepted", text: "Lo mismo para notas crédito y notas débito." },
  { name: "document.delivered", text: "El correo con el PDF llegó a tu cliente." },
] as const;

export function WebhooksSection() {
  return (
    <Section
      eyebrow="Webhooks"
      title="Tu sistema se entera al instante"
      lead={
        <>
          Cada evento llega firmado según Standard Webhooks (HMAC-SHA256) y se reintenta con espera
          creciente si tu servidor no responde.{" "}
          <a
            href={`${docsUrl}/guias/webhooks`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Ver la guía de webhooks
          </a>
        </>
      }
    >
      <ul className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2">
        {events.map((event) => (
          <li key={event.name} className="flex flex-col gap-1 bg-background p-5">
            <code className="font-mono text-sm">{event.name}</code>
            <p className="text-md/6 text-pretty text-muted-foreground">{event.text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const businessBenefits = [
  "Emite facturas y notas desde el navegador, sin instalar nada",
  "PDF con tu información, el CUFE y el código QR",
  "Historial de documentos con búsqueda y descarga del XML",
  "Te guiamos en la habilitación ante la DIAN, paso a paso",
];

export function BusinessSection({
  whatsappNumber,
  screenshotUrl,
}: {
  whatsappNumber: string | null;
  screenshotUrl: string;
}) {
  return (
    <Section
      eyebrow="Para negocios"
      title="Sin código, desde la consola"
      lead="¿No tienes un equipo de desarrollo? Factura desde la consola de Cetus con los mismos documentos que emite la API."
    >
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ul className="flex flex-col gap-3 text-md">
            {businessBenefits.map((benefit) => (
              <li key={benefit} className="flex gap-2">
                <FileCheck2Icon className="mt-0.5 size-4 shrink-0 text-success-foreground" />
                {benefit}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <ConsoleCta audience="negocio" section="business" label="Empezar gratis" />
            <WhatsAppButton number={whatsappNumber} section="business" />
          </div>
        </div>
        <img
          src={screenshotUrl}
          alt="El formulario de una factura en la consola de Cetus, con el cliente y las líneas ya llenos"
          width={1280}
          height={800}
          loading="lazy"
          className="w-full rounded-xl shadow-sm outline-1 -outline-offset-1 outline-black/10 lg:col-span-3 dark:outline-white/10"
        />
      </div>
    </Section>
  );
}

export function CalculatorSection() {
  return (
    <Section
      eyebrow="Calculadora"
      title="¿Debes facturar electrónicamente?"
      lead="Si eres persona natural, depende de tus ingresos y de cómo trabajas. Respóndelo en un minuto, sin registrarte."
    >
      <div>
        <Link
          to="/estoy-obligado-a-facturar"
          className={linkButtonVariants({ variant: "outline", size: "lg" })}
        >
          Hacer el cálculo
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </div>
    </Section>
  );
}

const securityPoints = [
  {
    icon: ShieldCheckIcon,
    title: "Tu certificado, cifrado",
    text: "El .p12 y su contraseña se sellan con AWS KMS. Ni la base de datos ni los registros los ven en claro.",
  },
  {
    icon: KeyRoundIcon,
    title: "Llaves por ambiente",
    text: "Simulación, pruebas y producción tienen llaves distintas. Si una se expone, la revocas y creas otra.",
  },
  {
    icon: BellRingIcon,
    title: "Webhooks firmados",
    text: "Verifica que cada evento viene de Cetus con su firma HMAC y su marca de tiempo.",
  },
] as const;

export function SecuritySection() {
  return (
    <Section
      eyebrow="Seguridad"
      title="Le puedes confiar tu certificado"
      lead={
        <>
          Lo que firma por tu empresa se guarda como debe. Y si algo falla, lo ves en la{" "}
          <a
            href={statusPageUrl}
            className="font-medium text-foreground underline underline-offset-4"
          >
            página de estado
          </a>
          .
        </>
      }
    >
      <ul className="grid gap-6 md:grid-cols-3">
        {securityPoints.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex flex-col gap-2">
            <Icon className="size-5 text-muted-foreground" />
            <h3 className="text-base font-medium">{title}</h3>
            <p className="text-md/6 text-pretty text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
