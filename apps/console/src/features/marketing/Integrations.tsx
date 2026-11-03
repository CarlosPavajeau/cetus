import { BellIcon } from "lucide-react";

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

import { LeadContactForm } from "./LeadContactForm";
import { Section } from "./Section";
import { sendIntegrationLead } from "./server";

const available = [
  {
    name: "cURL",
    text: "Cualquier lenguaje que haga HTTP",
    href: `${docsUrl}/inicio-rapido/desarrolladores`,
  },
  {
    name: "JavaScript",
    text: "Node.js con fetch",
    href: `${docsUrl}/inicio-rapido/desarrolladores`,
  },
  { name: "Python", text: "Con requests", href: `${docsUrl}/inicio-rapido/desarrolladores` },
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

export function IntegrationsSection() {
  return (
    <Section
      eyebrow="Integraciones"
      title="Conéctalo con lo que ya usas"
      lead="Hoy, con cualquier lenguaje que hable HTTP. Pronto, con tu tienda y tus automatizaciones: dinos cuál quieres y te avisamos cuando esté lista."
    >
      <div className="flex flex-col gap-8">
        <ul className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
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
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.map((each) => (
              <li key={each.integration} className="flex flex-col gap-3 rounded-xl border p-5">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{each.name}</span>
                  <span className="text-md/6 text-pretty text-muted-foreground">{each.text}</span>
                </div>
                <Notify integration={each.integration} name={each.name} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

function Notify({ integration, name }: { integration: LeadIntegration; name: string }) {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className="mt-auto self-start" />}
      >
        <BellIcon data-icon="inline-start" />
        Avísame
        <span className="sr-only">: {name}</span>
      </PopoverTrigger>
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
