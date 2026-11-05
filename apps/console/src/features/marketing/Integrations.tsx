import { BellIcon } from "lucide-react";
import type { ReactElement, ReactNode } from "react";

import { Button } from "~/components/ui/button";
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
import { cn } from "~/lib/utils";

import { LeadContactForm } from "./LeadContactForm";
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

const upcoming = [
  { integration: "WOOCOMMERCE", name: "WooCommerce", text: "Factura cada pedido de tu tienda" },
  { integration: "SHOPIFY", name: "Shopify", text: "Factura cada pedido de tu tienda" },
  {
    integration: "AUTOMATIONS",
    name: "n8n, Make y Zapier",
    text: "Factura desde tus automatizaciones",
  },
  { integration: "PAYMENTS", name: "Wompi y Bold", text: "Factura cada pago aprobado" },
] as const satisfies readonly { integration: LeadIntegration; name: string; text: string }[];

const forBusinesses = new Set<LeadIntegration>(["WOOCOMMERCE", "SHOPIFY", "PAYMENTS"]);

/** The integrations a business would use, as one line: each name opens its notify form. */
export function UpcomingForBusinesses() {
  const items = upcoming.filter((each) => forBusinesses.has(each.integration));
  return (
    <p className="text-md/6 text-pretty text-muted-foreground">
      Próximamente, cada pedido o pago aprobado se facturará solo desde{" "}
      {items.map((each, index) => (
        <span key={each.integration}>
          <Notify
            integration={each.integration}
            name={each.name}
            trigger={
              <button
                type="button"
                className="font-medium text-foreground underline underline-offset-4"
              />
            }
          >
            {each.name}
          </Notify>
          {index < items.length - 2 ? ", " : index === items.length - 2 ? " o " : ""}
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
      lead="Hoy, con cualquier lenguaje que hable HTTP. Pronto, con tu tienda y tus automatizaciones: dinos cuál quieres y te avisamos cuando esté lista."
    >
      <div className="flex flex-col gap-8">
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
        <div className="flex flex-col gap-4">
          <h3 className="font-mono text-xs/5 tracking-wider text-muted-foreground uppercase">
            Próximamente
          </h3>
          <UpcomingList items={upcoming} className="sm:grid-cols-2 lg:grid-cols-4" />
        </div>
      </div>
    </Section>
  );
}

function UpcomingList({
  items,
  className,
}: {
  items: readonly (typeof upcoming)[number][];
  className: string;
}) {
  return (
    <ul className={cn("grid gap-4", className)}>
      {items.map((each) => (
        <li key={each.integration} className="flex flex-col gap-3 rounded-xl border p-5">
          <div className="flex flex-col gap-1">
            <span className="font-medium">{each.name}</span>
            <span className="text-md/6 text-pretty text-muted-foreground">{each.text}</span>
          </div>
          <Notify
            integration={each.integration}
            name={each.name}
            trigger={<Button variant="outline" size="sm" className="mt-auto self-start" />}
          >
            <BellIcon data-icon="inline-start" />
            Avísame
            <span className="sr-only">: {each.name}</span>
          </Notify>
        </li>
      ))}
    </ul>
  );
}

function Notify({
  integration,
  name,
  trigger,
  children,
}: {
  integration: LeadIntegration;
  name: string;
  trigger: ReactElement;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger render={trigger}>{children}</PopoverTrigger>
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
