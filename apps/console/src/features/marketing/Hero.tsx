import { BookOpenIcon, CheckIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { docsUrl } from "~/lib/docs";

import { AudienceToggle } from "./AudienceToggle";
import { CodeBlock } from "./CodeBlock";
import { ConsoleCta } from "./ConsoleCta";
import { linkButtonVariants } from "./linkButton";
import type { Audience } from "./links";
import { snippets } from "./snippets";
import { WhatsAppButton } from "./WhatsAppButton";

const trust = [
  "Simulación y habilitación sin costo",
  "Certificado de firma cifrado con AWS KMS",
  "Webhooks firmados en tiempo real",
];

export function Hero({
  audience,
  onAudienceChange,
  heroCurlHtml,
  whatsappNumber,
  consoleScreenshotUrl,
}: {
  audience: Audience;
  onAudienceChange: (audience: Audience) => void;
  heroCurlHtml: string;
  whatsappNumber: string | null;
  consoleScreenshotUrl: string;
}) {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 pt-16 pb-section text-center md:px-6 md:pt-24">
      <Badge variant="muted">API de facturación electrónica · Hecha para Colombia</Badge>
      <div className="flex max-w-3xl flex-col gap-5">
        <h1 className="font-heading text-display font-semibold tracking-tight text-balance">
          Tu producto. Nuestra API. Conectados a la DIAN.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-pretty text-muted-foreground">
          Facturas, notas crédito y notas débito, generadas, firmadas y validadas por la DIAN con
          una sola llamada.
        </p>
      </div>

      <AudienceToggle audience={audience} onChange={onAudienceChange} />

      {audience === "dev" ? (
        <div className="flex w-full max-w-2xl flex-col items-center gap-6">
          <div className="w-full">
            <CodeBlock
              html={heroCurlHtml}
              code={snippets.heroCurl.code}
              title="Terminal"
              copyLabel="Copiar el comando"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <ConsoleCta audience="dev" label="Crear llave de simulación" />
            <a
              href={`${docsUrl}/inicio-rapido/desarrolladores`}
              className={linkButtonVariants({ variant: "outline", size: "lg" })}
            >
              <BookOpenIcon data-icon="inline-start" />
              Ver documentación
            </a>
          </div>
        </div>
      ) : (
        <div className="flex w-full max-w-4xl flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-3">
            <ConsoleCta audience="negocio" label="Empezar gratis" />
            <WhatsAppButton number={whatsappNumber} />
          </div>
          <img
            src={consoleScreenshotUrl}
            alt="Una factura aceptada en la consola de Cetus, con su CUFE, el emisor, el cliente y el detalle"
            width={1280}
            height={800}
            className="w-full rounded-xl shadow-sm outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
          />
        </div>
      )}

      <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {trust.map((item) => (
          <li key={item} className="flex items-center gap-1.5">
            <CheckIcon className="size-4 text-success-foreground" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
