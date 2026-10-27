import {
  ArrowRightIcon,
  ClockIcon,
  FileKeyIcon,
  FileTextIcon,
  GlobeLockIcon,
  type LucideIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";

import { steps } from "./steps";

const requirements: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: FileTextIcon,
    title: "Tu RUT actualizado",
    text: "De ahí salen el NIT, el nombre, las responsabilidades tributarias y la dirección.",
  },
  {
    icon: GlobeLockIcon,
    title: "Acceso al portal de la DIAN",
    text: "Con el usuario del representante legal o de la persona natural, en el servicio de facturación electrónica.",
  },
  {
    icon: FileKeyIcon,
    title: "Tu certificado de firma digital",
    text: "El archivo .p12 o .pfx a nombre del emisor y la contraseña que lo acompaña.",
  },
  {
    icon: ClockIcon,
    title: "Unos 20 minutos",
    text: "Cada paso se guarda al continuar: puedes salir y retomarlo donde lo dejaste.",
  },
];

/**
 * What the assistant does and what to have at hand, before a new issuer is created. Habilitación
 * is where every issuer set up from the console starts.
 */
export function Welcome({ onStart, onExit }: { onStart: () => void; onExit: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex max-w-prose flex-col gap-2">
        <h2 className="font-heading text-2xl font-normal tracking-tight">Antes de empezar</h2>
        <p className="text-sm text-muted-foreground">
          Vas a registrar a tu empresa o a ti como emisor de facturas electrónicas. Al terminar, tu
          emisor queda en <strong className="font-medium text-foreground">habilitación</strong>:
          envías el set de pruebas de la DIAN y, cuando lo aprueben, pasas a producción.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section
          aria-labelledby="welcome-requirements"
          className="flex flex-1 flex-col gap-5 rounded-lg border p-4 sm:p-6"
        >
          <h3 id="welcome-requirements" className="text-base font-medium">
            Ten a la mano
          </h3>
          <ul className="grid gap-5 sm:grid-cols-2">
            {requirements.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="welcome-steps"
          className="flex w-full shrink-0 flex-col gap-4 rounded-lg border bg-card p-5 lg:w-80"
        >
          <h3 id="welcome-steps" className="text-base font-medium">
            Los pasos
          </h3>
          <ol className="flex flex-col gap-3">
            {steps.map((step) => (
              <li key={step.number} className="flex items-center gap-3 text-sm">
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full border text-2xs tabular-nums"
                  aria-hidden
                >
                  {step.number}
                </span>
                {step.title}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <Button type="button" variant="outline" onClick={onExit}>
          Salir
        </Button>
        <Button type="button" onClick={onStart}>
          Empezar
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
