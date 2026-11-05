import { BookOpenIcon, CheckIcon } from "lucide-react";

import { docsUrl } from "~/lib/docs";

import { AudienceToggle } from "./AudienceToggle";
import { CodeBlock } from "./CodeBlock";
import { ConsoleCta } from "./ConsoleCta";
import { linkButtonVariants } from "./linkButton";
import type { Audience } from "./links";
import { WhatsAppButton } from "./WhatsAppButton";

const copy = {
  dev: {
    title: ["Tu producto.", "Nuestra API.", "Conectados a la DIAN."],
    lead: "Facturas, notas crédito y notas débito, generadas, firmadas y validadas por la DIAN con una sola llamada.",
    trust: [
      "Simulación y habilitación sin costo",
      "Certificado de firma cifrado con AWS KMS",
      "Webhooks firmados en tiempo real",
    ],
  },
  negocio: {
    title: ["Factura ante la DIAN", "desde tu navegador."],
    lead: "Emite facturas, notas crédito y notas débito desde la consola. Cetus las firma, las envía a la DIAN y le llegan a tu cliente por correo con el PDF.",
    trust: [
      "Simulación y habilitación sin costo",
      "Certificado de firma cifrado con AWS KMS",
      "Tu cliente recibe el PDF por correo",
    ],
  },
} as const satisfies Record<
  Audience,
  { title: readonly string[]; lead: string; trust: readonly string[] }
>;

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
  const { title, lead, trust } = copy[audience];

  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 pt-16 pb-section text-center md:px-6 md:pt-24">
      <div className="flex max-w-3xl flex-col gap-5">
        <h1 className="font-heading text-display font-medium tracking-display text-balance">
          {title.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        <p className="mx-auto max-w-2xl text-lg/8 text-pretty text-muted-foreground">{lead}</p>
      </div>

      <AudienceToggle audience={audience} onChange={onAudienceChange} />

      {audience === "dev" ? (
        <div className="flex w-full max-w-2xl flex-col items-center gap-6">
          <div className="w-full">
            <CodeBlock
              html={heroCurlHtml}
              snippet="heroCurl"
              title="Terminal"
              copyLabel="Copiar el comando"
            />
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
            <ConsoleCta audience="dev" section="hero" label="Crear llave de simulación" />
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
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
            <ConsoleCta audience="negocio" section="hero" label="Empezar gratis" />
            <WhatsAppButton number={whatsappNumber} section="hero" />
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
            <CheckIcon className="size-4 text-muted-foreground" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
