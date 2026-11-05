import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { LeadIntegration } from "~/lib/api/types";
import { docsUrl } from "~/lib/docs";

import { LeadContactForm } from "./LeadContactForm";
import type { Audience } from "./links";
import { Section } from "./Section";
import { sendIntegrationLead } from "./server";

const available = [
  {
    name: "Postman",
    text: "La colección lista para importar",
    href: `${docsUrl}/cetus.postman_collection.json`,
  },
  { name: "OpenAPI", text: "Genera tu propio cliente", href: `${docsUrl}/openapi.public.json` },
  { name: "Referencia", text: "Cada endpoint, con ejemplos", href: `${docsUrl}/reference` },
] as const;

const upcoming = {
  WOOCOMMERCE: "WooCommerce",
  SHOPIFY: "Shopify",
  PAYMENTS: "Wompi y Bold",
  AUTOMATIONS: "n8n, Make y Zapier",
} as const satisfies Record<LeadIntegration, string>;

const upcomingCopy = {
  dev: {
    intro: "Próximamente, cada pedido, pago o automatización se facturará solo desde",
    integrations: ["WOOCOMMERCE", "SHOPIFY", "PAYMENTS", "AUTOMATIONS"],
  },
  negocio: {
    intro: "Próximamente, cada pedido o pago aprobado se facturará solo desde",
    integrations: ["WOOCOMMERCE", "SHOPIFY", "PAYMENTS"],
  },
} as const satisfies Record<Audience, { intro: string; integrations: readonly LeadIntegration[] }>;

/** The upcoming integrations as one line: each name opens its notify form. */
export function UpcomingIntegrations({ audience }: { audience: Audience }) {
  const { intro, integrations } = upcomingCopy[audience];
  return (
    <p className="max-w-prose text-md/6 text-pretty text-muted-foreground">
      {intro}{" "}
      {integrations.map((integration, index) => (
        <span key={integration}>
          <Notify integration={integration} name={upcoming[integration]}>
            {upcoming[integration]}
          </Notify>
          {index < integrations.length - 2 ? ", " : index === integrations.length - 2 ? " o " : ""}
        </span>
      ))}
      . Elige el tuyo y te avisamos cuando esté listo.
    </p>
  );
}

export function IntegrationsSection() {
  return (
    <Section
      eyebrow="Integraciones"
      title="Conéctalo con lo que ya usas"
      lead="Hoy, con cualquier lenguaje que hable HTTP."
    >
      <div className="flex flex-col gap-6">
        <ul className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
          {available.map((each) => (
            <li key={each.name} className="bg-background">
              <a href={each.href} className="flex h-full flex-col gap-1 p-5 hover:bg-muted/50">
                <span className="font-medium">{each.name}</span>
                <span className="text-md/6 text-pretty text-muted-foreground">{each.text}</span>
              </a>
            </li>
          ))}
        </ul>
        <UpcomingIntegrations audience="dev" />
      </div>
    </Section>
  );
}

function Notify({
  integration,
  name,
  children,
}: {
  integration: LeadIntegration;
  name: string;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger render={<TextButton aria-label={name} />}>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <PopoverHeader>
          <PopoverTitle>{name}</PopoverTitle>
          <PopoverDescription>Te escribimos una vez, cuando esté lista.</PopoverDescription>
        </PopoverHeader>
        <LeadContactForm
          submitLabel="Avisarme"
          purpose={`avisarme cuando la integración con ${name} esté lista`}
          kind="integration"
          onSubmit={(contact) =>
            sendIntegrationLead({
              data: { ...contact, integration },
            })
          }
          sent={(email) => `Listo. Te avisaremos a ${email}.`}
        />
      </PopoverContent>
    </Popover>
  );
}

/** A link-styled button inside running text. */
function TextButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn("font-medium text-foreground underline underline-offset-4", className)}
      {...props}
    />
  );
}
