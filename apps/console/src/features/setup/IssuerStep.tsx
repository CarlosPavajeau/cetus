import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation } from "@tanstack/react-query";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";

import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import type { IssuerDetail } from "~/lib/api/types";

import { TextField } from "./fields";
import { LocationFields } from "./LocationFields";
import { type IssuerValues, issuerSchema } from "./schema";
import { createIssuer, updateIssuer } from "./server";
import { FieldRow, FieldSection, StepGuide, StepLayout } from "./StepLayout";

const personTypeItems = [
  { value: "LEGAL_ENTITY", label: "Persona jurídica" },
  { value: "NATURAL_PERSON", label: "Persona natural" },
] as const;

function defaultValues(issuer: IssuerDetail | null): IssuerValues {
  return {
    legalName: issuer?.legalName ?? "",
    tradeName: issuer?.tradeName ?? null,
    nit: issuer?.nit ?? "",
    personType: issuer?.personType ?? "LEGAL_ENTITY",
    taxLevelCodes: issuer?.taxLevelCodes.join(", ") ?? "",
    responsibleForIva: issuer?.responsibleForIva ?? false,
    line: issuer?.address.line ?? "",
    postalCode: issuer?.address.postalCode ?? "",
    departmentCode: issuer?.address.departmentCode ?? "",
    departmentName: issuer?.address.departmentName ?? "",
    municipalityCode: issuer?.address.municipalityCode ?? "",
    cityName: issuer?.address.cityName ?? "",
    email: issuer?.email ?? "",
    phone: issuer?.phone ?? "",
  };
}

/** Step 1: the tax data of the issuer, as it appears in its RUT. Creates the issuer the first time. */
export function IssuerStep({
  issuer,
  onBack,
  onSaved,
}: {
  issuer: IssuerDetail | null;
  onBack: () => void;
  onSaved: (issuerId: string) => Promise<void>;
}) {
  const ivaId = useId();
  const personTypeId = useId();
  const create = useMutation({ mutationFn: createIssuer });
  const update = useMutation({ mutationFn: updateIssuer });
  const form = useForm({
    resolver: arktypeResolver(issuerSchema),
    defaultValues: defaultValues(issuer),
  });
  const { isSubmitting, isDirty, errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (!issuer) {
        const created = await create.mutateAsync({ data: values });
        await onSaved(created.id);
      } else {
        if (isDirty) {
          await update.mutateAsync({ data: { id: issuer.id, issuer: values } });
        }
        await onSaved(issuer.id);
      }
    } catch (error) {
      form.setError("root", { message: (error as Error).message });
    }
  });

  return (
    <StepLayout
      step={1}
      lead="Ingresa la información del emisor tal como aparece en su RUT."
      error={errors.root?.message}
      submitting={isSubmitting}
      onSubmit={onSubmit}
      onBack={onBack}
      guide={
        <StepGuide
          title="Tu RUT, a la mano"
          lead="Estos datos identifican a quien emitirá las facturas electrónicas."
          tips={[
            {
              title: "Revisa la identificación",
              text: "Usa el NIT y el nombre o razón social registrados en el RUT.",
            },
            {
              title: "Responsabilidades tributarias",
              text: "Conserva los códigos que aparecen en tu RUT, por ejemplo O-13 u O-47.",
            },
            {
              title: "Ubicación sin complicaciones",
              text: "Los códigos geográficos acompañan a cada ubicación para ayudarte a revisar la correspondencia.",
            },
          ]}
          note={
            issuer?.environment === "LIVE"
              ? "Este es el emisor de producción: sus facturas tienen validez fiscal ante la DIAN."
              : "El entorno TEST es informativo. Cetus lo asigna automáticamente; no necesitas elegirlo."
          }
        />
      }
    >
      <FieldSection title="Identificación tributaria">
        <TextField
          control={form.control}
          name="legalName"
          label="Nombre o razón social"
          autoComplete="organization"
        />
        <FieldRow>
          <TextField
            control={form.control}
            name="nit"
            label="NIT"
            inputMode="numeric"
            readOnly={issuer !== null}
            hint={
              issuer ? "El NIT no cambia una vez creado el emisor." : "Sin dígito de verificación."
            }
          />
          <Controller
            name="personType"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1.75">
                <FieldLabel htmlFor={personTypeId} className="text-xs">
                  Tipo de persona
                </FieldLabel>
                <Select
                  items={personTypeItems}
                  name={field.name}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger
                    id={personTypeId}
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                    onBlur={field.onBlur}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {personTypeItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError errors={[fieldState.error]} className="text-[10px]" />
              </Field>
            )}
          />
          <TextField
            control={form.control}
            name="taxLevelCodes"
            label="Responsabilidades tributarias"
            placeholder="O-13, O-15"
          />
        </FieldRow>
      </FieldSection>

      <Separator />

      <FieldSection title="Dirección del emisor">
        <FieldRow className="sm:grid-cols-2">
          <TextField
            control={form.control}
            name="line"
            label="Dirección"
            autoComplete="street-address"
          />
          <TextField
            control={form.control}
            name="postalCode"
            label="Código postal"
            inputMode="numeric"
            autoComplete="postal-code"
          />
        </FieldRow>
        <FieldRow>
          <LocationFields form={form} />
        </FieldRow>
      </FieldSection>

      <Separator />

      <FieldSection title="Contacto y responsabilidad de IVA">
        <FieldRow className="sm:grid-cols-[1fr_1fr_9.5rem]">
          <TextField
            control={form.control}
            name="email"
            label="Correo electrónico"
            type="email"
            autoComplete="email"
          />
          <TextField
            control={form.control}
            name="phone"
            label="Teléfono"
            type="tel"
            autoComplete="tel"
          />
          <Controller
            name="responsibleForIva"
            control={form.control}
            render={({ field }) => (
              <Field className="gap-1.75">
                <FieldLabel htmlFor={ivaId} className="text-xs">
                  Responsable de IVA
                </FieldLabel>
                <div className="flex h-9 items-center gap-2.5">
                  <Checkbox
                    id={ivaId}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                    onBlur={field.onBlur}
                  />
                  <span className="text-xs">{field.value ? "Sí" : "No"}</span>
                </div>
              </Field>
            )}
          />
        </FieldRow>
      </FieldSection>
    </StepLayout>
  );
}
