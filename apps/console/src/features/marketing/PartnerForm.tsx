import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useId, useState } from "react";
import { type Control, Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";

import { track } from "./analytics";
import { ConsentField, LeadSent, TrapField, leadFailure } from "./LeadFields";
import {
  type PartnerLead,
  type PartnerLeadValues,
  emptyPartnerLead,
  partnerLeadSchema,
} from "./leads";
import { sendPartnerLead } from "./server";

type TextName = "name" | "email" | "company" | "phone" | "companies";

/** "Quiero ser socio": the support mailbox answers by email. */
export function PartnerForm() {
  const id = useId();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm({
    resolver: arktypeResolver(partnerLeadSchema),
    defaultValues: emptyPartnerLead,
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (lead) => {
    try {
      const result = await sendPartnerLead({ data: lead });
      if (!result.ok) {
        form.setError("root", { message: result.message });
        return;
      }
      track({ name: "lead_submitted", kind: "partner" });
      setSentTo(lead.email);
    } catch {
      form.setError("root", { message: leadFailure });
    }
  });

  if (sentTo) {
    return <LeadSent>{`Recibimos tus datos. Te escribiremos a ${sentTo}.`}</LeadSent>;
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Quiero ser socio">
      <FieldGroup>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField control={form.control} name="name" label="Nombre" autoComplete="name" />
          <TextField
            control={form.control}
            name="email"
            label="Correo"
            type="email"
            autoComplete="email"
          />
          <TextField
            control={form.control}
            name="company"
            label="Firma o empresa (opcional)"
            autoComplete="organization"
          />
          <TextField
            control={form.control}
            name="phone"
            label="Teléfono (opcional)"
            type="tel"
            autoComplete="tel"
          />
          <TextField
            control={form.control}
            name="companies"
            label="¿Cuántas empresas manejas?"
            inputMode="numeric"
          />
        </div>
        <Controller
          name="message"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-message`}>¿Qué necesitas? (opcional)</FieldLabel>
              <Textarea
                {...field}
                id={`${id}-message`}
                rows={4}
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
              purpose="responderme sobre el programa de Socios"
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
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            Quiero ser socio
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function TextField({
  control,
  name,
  label,
  type = "text",
  autoComplete,
  inputMode,
}: {
  control: Control<PartnerLeadValues, unknown, PartnerLead>;
  name: TextName;
  label: string;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  inputMode?: "numeric";
}) {
  const id = useId();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...field}
            id={id}
            type={type}
            autoComplete={autoComplete}
            inputMode={inputMode}
            aria-invalid={fieldState.invalid}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
