import { arktypeResolver } from "@hookform/resolvers/arktype";
import { CheckIcon } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { LegalLink } from "~/features/legal/LegalLink";

import { type LeadKind, track } from "./analytics";
import { type LeadResult, emptyLeadContact, leadContactSchema } from "./leads";

export type LeadContact = { email: string; website: string };

/** An email and the authorization to use it for one purpose, then a confirmation in place of the form. */
export function LeadContactForm({
  title,
  submitLabel,
  purpose,
  kind,
  onSubmit,
  sent,
}: {
  title?: string;
  submitLabel: string;
  /** What the person authorizes, after "Autorizo a Cetus a usar este correo para": "avisarme cuando…". */
  purpose: string;
  kind: LeadKind;
  onSubmit: (contact: LeadContact) => Promise<LeadResult>;
  sent: (email: string) => string;
}) {
  const id = useId();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm({
    resolver: arktypeResolver(leadContactSchema),
    defaultValues: emptyLeadContact,
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (contact) => {
    try {
      const result = await onSubmit({ email: contact.email, website: contact.website });
      if (!result.ok) {
        form.setError("root", { message: result.message });
        return;
      }
      track({ name: "lead_submitted", kind });
      setSentTo(contact.email);
    } catch {
      form.setError("root", {
        message: "No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo.",
      });
    }
  });

  if (sentTo) {
    return (
      <output className="flex gap-2 text-md/6 text-pretty">
        <CheckIcon className="mt-1 size-4 shrink-0 text-success-foreground" />
        {sent(sentTo)}
      </output>
    );
  }

  return (
    <form onSubmit={submit} noValidate aria-labelledby={title ? `${id}-title` : undefined}>
      <FieldGroup>
        {title && (
          <h3 id={`${id}-title`} className="text-md font-medium">
            {title}
          </h3>
        )}
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-email`}>Correo</FieldLabel>
              <Input
                {...field}
                id={`${id}-email`}
                type="email"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="consent"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <Checkbox
                id={`${id}-consent`}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked)}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
                aria-describedby={`${id}-consent-error`}
              />
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor={`${id}-consent`} className="block font-normal">
                  Autorizo a Cetus a usar este correo para {purpose}, según la{" "}
                  <LegalLink document="privacy">política de datos</LegalLink>.
                </FieldLabel>
                <FieldError id={`${id}-consent-error`} errors={[fieldState.error]} />
              </div>
            </Field>
          )}
        />
        <div aria-hidden="true" className="sr-only">
          <label htmlFor={`${id}-website`}>Deja este campo vacío</label>
          <input
            {...form.register("website")}
            id={`${id}-website`}
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        {errors.root && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}
        <div>
          <Button type="submit" variant="outline" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
