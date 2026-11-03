import { CheckIcon } from "lucide-react";
import type { ComponentProps } from "react";
import type { FieldError as FormFieldError } from "react-hook-form";

import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { LegalLink } from "~/features/legal/LegalLink";

/** The authorization every lead form asks for, never checked beforehand. */
export function ConsentField({
  id,
  purpose,
  checked,
  onCheckedChange,
  onBlur,
  error,
}: {
  id: string;
  /** What the person authorizes, after "Autorizo a Cetus a usar este correo para": "avisarme cuando…". */
  purpose: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onBlur: () => void;
  error: FormFieldError | undefined;
}) {
  return (
    <Field orientation="horizontal" data-invalid={error !== undefined}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next)}
        onBlur={onBlur}
        aria-invalid={error !== undefined}
        aria-describedby={`${id}-error`}
      />
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={id} className="block font-normal">
          Autorizo a Cetus a usar este correo para {purpose}, según la{" "}
          <LegalLink document="privacy">política de datos</LegalLink>.
        </FieldLabel>
        <FieldError id={`${id}-error`} errors={[error]} />
      </div>
    </Field>
  );
}

/** Hidden from people and assistive technology; only a bot fills it (see `leadTrap`). */
export function TrapField({ id, ...input }: { id: string } & ComponentProps<"input">) {
  return (
    <div aria-hidden="true" className="sr-only">
      <label htmlFor={id}>Deja este campo vacío</label>
      <input {...input} id={id} type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

/** Takes the form's place once it is sent. */
export function LeadSent({ children }: { children: string }) {
  return (
    <output className="flex gap-2 text-md/6 text-pretty">
      <CheckIcon className="mt-1 size-4 shrink-0 text-success-foreground" />
      {children}
    </output>
  );
}

export const leadFailure =
  "No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo.";
