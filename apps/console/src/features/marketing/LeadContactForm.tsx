import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";

import { type LeadKind, track } from "./analytics";
import { ConsentField, LeadSent, TrapField, leadFailure } from "./LeadFields";
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
  /** See {@link ConsentField}. */
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
      form.setError("root", { message: leadFailure });
    }
  });

  if (sentTo) {
    return <LeadSent>{sent(sentTo)}</LeadSent>;
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
            <ConsentField
              id={`${id}-consent`}
              purpose={purpose}
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error}
            />
          )}
        />
        <TrapField id={`${id}-website`} {...form.register("website")} />
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
