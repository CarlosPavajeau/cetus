import { useId } from "react";
import { Controller, type UseFormReturn, useWatch } from "react-hook-form";

import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
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
import type { IssuerValues } from "./schema";
import { FieldRow, FieldSection } from "./StepLayout";
import { isTaxLevelCode, nextTaxLevels, taxLevelItems } from "./taxLevels";

const personTypeItems = [
  { value: "LEGAL_ENTITY", label: "Persona jurídica" },
  { value: "NATURAL_PERSON", label: "Persona natural" },
] as const;

export function issuerDefaults(issuer: IssuerDetail | null): IssuerValues {
  return {
    legalName: issuer?.legalName ?? "",
    tradeName: issuer?.tradeName ?? null,
    nit: issuer?.nit ?? "",
    personType: issuer?.personType ?? "LEGAL_ENTITY",
    // Codes outside the DIAN table (older issuers) are dropped: the person picks them again.
    taxLevelCodes: issuer?.taxLevelCodes.filter(isTaxLevelCode) ?? [],
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

/**
 * The tax data of an issuer as it appears in its RUT, shared by step 1 of the assistant and the
 * issuer's edit page. The NIT never changes once the issuer exists, and the person type, which
 * comes with the NIT, only while it is being set up.
 */
export function IssuerFields({
  form,
  issuer,
}: {
  form: UseFormReturn<IssuerValues>;
  issuer: IssuerDetail | null;
}) {
  const ivaId = useId();
  const personTypeId = useId();
  const taxLevelsId = useId();
  const personTypeLocked = issuer !== null && issuer.status !== "ONBOARDING";
  const personType = useWatch({ control: form.control, name: "personType" });

  return (
    <>
      <FieldSection title="Identificación tributaria">
        <TextField
          control={form.control}
          name="legalName"
          label="Nombre o razón social"
          autoComplete="organization"
          hint={
            personType === "NATURAL_PERSON"
              ? "Como en el RUT: apellidos y luego nombres, por ejemplo PEREZ GOMEZ ANA MARIA."
              : undefined
          }
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
                  disabled={personTypeLocked}
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
                {personTypeLocked && !fieldState.invalid && (
                  <FieldDescription className="text-[10px]">
                    Viene con el NIT: no cambia una vez configurado el emisor.
                  </FieldDescription>
                )}
                <FieldError errors={[fieldState.error]} className="text-[10px]" />
              </Field>
            )}
          />
          <Controller
            name="taxLevelCodes"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="gap-1.75">
                <FieldLabel htmlFor={taxLevelsId} className="text-xs">
                  Responsabilidades tributarias
                </FieldLabel>
                <Select
                  multiple
                  items={taxLevelItems}
                  name={field.name}
                  value={field.value}
                  onValueChange={(value) => field.onChange(nextTaxLevels(field.value, value))}
                >
                  <SelectTrigger
                    id={taxLevelsId}
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                    onBlur={field.onBlur}
                  >
                    <SelectValue>
                      {(codes: string[]) => (codes.length > 0 ? codes.join(", ") : "Elige del RUT")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {taxLevelItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          <span className="font-mono text-xs">{item.value}</span>
                          <span className="text-muted-foreground">{item.label}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError errors={[fieldState.error]} className="text-[10px]" />
              </Field>
            )}
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
    </>
  );
}
