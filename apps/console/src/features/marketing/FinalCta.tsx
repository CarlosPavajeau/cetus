import { BookOpenIcon } from "lucide-react";

import { docsUrl } from "~/lib/docs";

import { ConsoleCta } from "./ConsoleCta";
import { linkButtonVariants } from "./linkButton";
import type { Audience } from "./links";
import { WhatsAppButton } from "./WhatsAppButton";

export function FinalCta({
  audience,
  whatsappNumber,
}: {
  audience: Audience;
  whatsappNumber: string | null;
}) {
  return (
    <section aria-labelledby="final-cta" className="border-t bg-muted/40">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-section text-center md:px-6">
        <h2
          id="final-cta"
          className="font-heading text-3xl font-medium tracking-heading text-balance sm:text-4xl md:text-5xl"
        >
          Tu primera factura de prueba, hoy.
        </h2>
        <p className="text-lg/8 text-pretty text-muted-foreground">
          Crea tu cuenta gratis y emite en simulación en minutos, sin certificado ni tarjeta. Pasas
          a producción cuando completes la habilitación ante la DIAN.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
          {audience === "dev" ? (
            <>
              <ConsoleCta audience="dev" section="final" label="Crear llave de simulación" />
              <a
                href={`${docsUrl}/inicio-rapido/desarrolladores`}
                className={linkButtonVariants({ variant: "outline", size: "lg" })}
              >
                <BookOpenIcon data-icon="inline-start" />
                Ver documentación
              </a>
            </>
          ) : (
            <>
              <ConsoleCta audience="negocio" section="final" label="Empezar gratis" />
              <WhatsAppButton number={whatsappNumber} section="final" />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
