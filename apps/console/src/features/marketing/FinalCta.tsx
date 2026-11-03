import { BookOpenIcon } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";
import { docsUrl } from "~/lib/docs";

import { AudienceToggle } from "./AudienceToggle";
import { ConsoleCta } from "./ConsoleCta";
import type { Audience } from "./links";
import { WhatsAppButton } from "./WhatsAppButton";

export function FinalCta({
  audience,
  onAudienceChange,
  whatsappNumber,
}: {
  audience: Audience;
  onAudienceChange: (audience: Audience) => void;
  whatsappNumber: string | null;
}) {
  return (
    <section aria-labelledby="final-cta" className="border-t bg-muted/40">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-section text-center md:px-6">
        <h2
          id="final-cta"
          className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl"
        >
          Tu primera factura aceptada, hoy.
        </h2>
        <p className="text-lg text-pretty text-muted-foreground">
          Crea tu cuenta gratis y emite en simulación en minutos, sin certificado ni tarjeta.
        </p>
        <AudienceToggle audience={audience} onChange={onAudienceChange} />
        <div className="flex flex-wrap justify-center gap-3">
          {audience === "dev" ? (
            <>
              <ConsoleCta audience="dev" label="Crear llave de sandbox" />
              <a
                href={`${docsUrl}/inicio-rapido/desarrolladores`}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                <BookOpenIcon data-icon="inline-start" />
                Ver documentación
              </a>
            </>
          ) : (
            <>
              <ConsoleCta audience="negocio" label="Crear cuenta gratis" />
              <WhatsAppButton number={whatsappNumber} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
