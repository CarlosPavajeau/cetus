import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  FileCheck2Icon,
  FlaskConicalIcon,
  HashIcon,
  KeyRoundIcon,
  type LucideIcon,
  QrCodeIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { statusPageUrl } from "~/features/status/links";
import { docsUrl } from "~/lib/docs";

import { CodeBlock } from "./CodeBlock";
import { ConsoleCta } from "./ConsoleCta";
import type { Audience } from "./links";
import { Section } from "./Section";
import type { SnippetName } from "./snippets";
import { WhatsAppButton } from "./WhatsAppButton";

type Feature = { icon: LucideIcon; title: string; text: string };

const devFeatures: readonly Feature[] = [
  {
    icon: FileCheck2Icon,
    title: "Factura electrónica de venta",
    text: "UBL 2.1 con totales, impuestos y CUFE calculados por Cetus a partir de tus líneas.",
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
    icon: FlaskConicalIcon,
    title: "Simulación idéntica a producción",
    text: "Integra sin certificado ni habilitación: la simulación responde como la DIAN, sin validez fiscal.",
  },
];

const businessFeatures: readonly Feature[] = [
  {
    icon: FileCheck2Icon,
    title: "Factura electrónica de venta",
    text: "Llenas el cliente y los productos. Cetus calcula los totales, los impuestos y el CUFE.",
  },
  {
    icon: QrCodeIcon,
    title: "PDF con CUFE y QR",
    text: "La factura en PDF, lista para descargar o enviar, junto al XML firmado que exige la DIAN.",
  },
  {
    icon: HashIcon,
    title: "Numeración y resoluciones",
    text: "Cetus numera cada documento con tu resolución vigente, sin huecos ni duplicados.",
  },
  {
    icon: FlaskConicalIcon,
    title: "Simulación idéntica a producción",
    text: "Prueba sin certificado ni habilitación: la simulación responde como la DIAN, sin validez fiscal.",
  },
];

const featureCopy = {
  dev: {
    features: devFeatures,
    lead: "Tú envías el pedido en JSON. Cetus lo convierte en un documento electrónico válido y se encarga del resto.",
  },
  negocio: {
    features: businessFeatures,
    lead: "Tú llenas la factura. Cetus la convierte en un documento electrónico válido y se encarga del resto.",
  },
} as const satisfies Record<Audience, { features: readonly Feature[]; lead: string }>;

export function FeaturesSection({ audience }: { audience: Audience }) {
  const { features, lead } = featureCopy[audience];
  return (
    <Section eyebrow="Cobertura" title="Todo lo que la DIAN exige, resuelto" lead={lead}>
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
    text: (
      <>
        Toda cuenta nueva trae una empresa de ejemplo lista para emitir. Crea una llave{" "}
        <code className="font-mono text-sm">cetus_sandbox_</code> en la consola.
      </>
    ),
  },
  {
    title: "Emite tu primera factura",
    text: (
      <>
        Envía el pedido a <code className="font-mono text-sm">POST /v1/invoices</code>. Cetus
        responde 202 con la factura numerada y te avisa por webhook.
      </>
    ),
  },
  {
    title: "Configura tu empresa ante la DIAN",
    text: "Registra tu emisor, sube tu certificado y envía el set de pruebas desde la consola.",
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

/** The events the demo's terminal ends with, under the band that shows them arriving. */
export function WebhookEvents() {
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {events.map((event) => (
          <li key={event.name} className="flex flex-col gap-1 bg-background p-5">
            <code className="font-mono text-sm">{event.name}</code>
            <p className="text-md/6 text-pretty text-muted-foreground">{event.text}</p>
          </li>
        ))}
      </ul>
      <p className="max-w-prose text-md/6 text-pretty text-muted-foreground">
        Cada evento llega firmado según Standard Webhooks (HMAC-SHA256) y se reintenta con espera
        creciente si tu servidor no responde.{" "}
        <a
          href={`${docsUrl}/guias/webhooks`}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Ver la guía de webhooks
        </a>
      </p>
    </div>
  );
}

const businessBenefits = [
  "Emite facturas y notas desde el navegador, sin instalar nada",
  "PDF con tu información, el código QR y el CUFE: el código único con el que la DIAN identifica la factura",
  "Historial de documentos con búsqueda y descarga del XML",
  "Te guiamos en la habilitación ante la DIAN, paso a paso",
];

/** `afterHero`: the band right below the business hero, which already says who it is for. */
export function BusinessSection({
  whatsappNumber,
  screenshotUrl,
  afterHero = false,
}: {
  whatsappNumber: string | null;
  screenshotUrl: string;
  afterHero?: boolean;
}) {
  return (
    <Section
      eyebrow={afterHero ? undefined : "Para negocios"}
      title="Sin código, desde la consola"
      lead={
        afterHero
          ? "Llenas el formulario de la factura y Cetus hace el resto. Son los mismos documentos que emite la API."
          : "¿No tienes un equipo de desarrollo? Factura desde la consola de Cetus con los mismos documentos que emite la API."
      }
    >
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ul className="flex flex-col gap-3 text-md">
            {businessBenefits.map((benefit) => (
              <li key={benefit} className="flex gap-2">
                <FileCheck2Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {benefit}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <ConsoleCta audience="negocio" section="business" label="Empezar gratis" />
            <WhatsAppButton number={whatsappNumber} section="business" />
          </div>
          <Link
            to="/estoy-obligado-a-facturar"
            className="flex items-center gap-1 self-start text-md font-medium underline underline-offset-4"
          >
            ¿Eres persona natural? Mira si debes facturar
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
        <img
          src={screenshotUrl}
          alt="El formulario de una factura en la consola de Cetus, con el cliente y las líneas ya llenos"
          width={1280}
          height={800}
          loading="lazy"
          className="w-full rounded-xl shadow-sm outline-1 -outline-offset-1 outline-black/10 lg:col-span-3 dark:outline-white/10 dark:brightness-90"
        />
      </div>
    </Section>
  );
}

const habilitacionSteps = [
  {
    value: "ejemplo",
    title: "Prueba con la empresa de ejemplo",
    text: "Tu cuenta trae una empresa lista para facturar en simulación. Emites tu primera factura el mismo día, sin RUT ni certificado.",
    image: "resumen-simulacion",
    alt: "El resumen de una cuenta nueva en la consola de Cetus, con la empresa de ejemplo lista para emitir una factura simulada",
  },
  {
    value: "rut",
    title: "Registra tu empresa con el RUT",
    text: "Razón social, NIT, responsabilidades y dirección, tal como aparecen en el RUT. La consola calcula el dígito de verificación para que lo compares.",
    image: "habilitacion-rut",
    alt: "El primer paso de la configuración del emisor: el tipo de persona, el NIT y la razón social, con la ayuda para encontrarlos en el RUT",
  },
  {
    value: "certificado",
    title: "Sube el certificado y la numeración de pruebas",
    text: "Registras a Cetus como tu software en el portal de la DIAN. Después subes tu certificado de firma y copias la clave técnica del rango de pruebas.",
    image: "habilitacion-numeracion",
    alt: "El último paso de la configuración: la clave técnica y la resolución del rango de pruebas, con los datos, el software y el certificado ya completos",
  },
  {
    value: "set",
    title: "Envía el set de pruebas",
    text: "Emites en pruebas las facturas que pide la DIAN. La consola cuenta cuántas aceptó para que lo compares con el portal.",
    image: "habilitacion-set-de-pruebas",
    alt: "La página del emisor en habilitación, con el avance del set de pruebas: tres facturas aceptadas por la DIAN",
  },
  {
    value: "produccion",
    title: "Pasa a producción",
    text: "Con la habilitación aprobada, pides tu resolución de numeración y eliges un plan. El emisor de producción conserva el software y el certificado.",
    image: "habilitacion-produccion",
    alt: "La confirmación para crear el emisor de producción con los mismos datos, el mismo software y una copia del certificado",
  },
] as const;

/** The business path from the sample company to production, each step beside the console screen it happens in. */
export function HabilitacionSection() {
  const [step, setStep] = useState<string>(habilitacionSteps[0].value);

  return (
    <Section
      title="De la empresa de ejemplo a tu primera factura real"
      lead={
        <>
          Facturas en simulación desde el primer día y te habilitas ante la DIAN cuando tengas tus
          documentos.{" "}
          <a
            href={`${docsUrl}/guias/como-habilitarse`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Leer la guía de habilitación
          </a>
        </>
      }
    >
      <ol className="flex flex-col gap-10 lg:hidden">
        {habilitacionSteps.map((each, index) => (
          <li key={each.value} className="flex flex-col gap-4">
            <StepText number={index + 1} title={each.title} text={each.text} />
            <ConsoleScreenshot step={each} />
          </li>
        ))}
      </ol>
      <TabsPrimitive.Root
        value={step}
        onValueChange={(value) => setStep(String(value))}
        orientation="vertical"
        className="hidden items-start gap-10 lg:grid lg:grid-cols-5"
      >
        <TabsPrimitive.List
          aria-label="Pasos de la habilitación"
          className="flex flex-col gap-1 lg:col-span-2"
        >
          {habilitacionSteps.map((each, index) => (
            <TabsPrimitive.Tab
              key={each.value}
              value={each.value}
              className="group/step rounded-lg p-3 text-left transition-colors duration-150 ease-out outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 data-active:bg-muted"
            >
              <StepText number={index + 1} title={each.title} text={each.text} />
            </TabsPrimitive.Tab>
          ))}
        </TabsPrimitive.List>
        {habilitacionSteps.map((each) => (
          <TabsPrimitive.Panel
            key={each.value}
            value={each.value}
            className="sticky top-24 col-span-3 outline-none"
          >
            <ConsoleScreenshot step={each} />
          </TabsPrimitive.Panel>
        ))}
      </TabsPrimitive.Root>
      <div>
        <ConsoleCta
          audience="negocio"
          section="habilitacion"
          label="Probar con la empresa de ejemplo"
        />
      </div>
    </Section>
  );
}

function StepText({ number, title, text }: { number: number; title: string; text: string }) {
  return (
    <span className="flex gap-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-background font-mono text-xs transition-colors duration-150 ease-out group-data-active/step:border-foreground group-data-active/step:bg-foreground group-data-active/step:text-background">
        {number}
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-base font-medium">{title}</span>
        <span className="text-md/6 text-pretty text-muted-foreground group-data-active/step:text-foreground">
          {text}
        </span>
      </span>
    </span>
  );
}

function ConsoleScreenshot({ step }: { step: { image: string; alt: string } }) {
  return (
    <img
      src={`${docsUrl}/images/consola/${step.image}.png`}
      alt={step.alt}
      width={1280}
      height={800}
      loading="lazy"
      className="w-full rounded-xl shadow-sm outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10 dark:brightness-90"
    />
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
] as const;

/** What a buyer weighs next to the price: where the certificate that signs for them lives. */
export function SecurityPoints() {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-medium">Le puedes confiar tu certificado</h3>
      <ul className="flex flex-col gap-4">
        {securityPoints.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3 text-sm">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{title}</span>
              <span className="text-pretty text-muted-foreground">{text}</span>
            </span>
          </li>
        ))}
      </ul>
      <a
        href={statusPageUrl}
        className="self-start text-sm font-medium underline underline-offset-4"
      >
        Ver la disponibilidad del servicio
      </a>
    </div>
  );
}
