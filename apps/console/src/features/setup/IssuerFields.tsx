import { useId } from "react";
import { Controller, type UseFormReturn, useWatch } from "react-hook-form";

import { ChoiceField } from "~/components/ChoiceField";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { nitCheckDigit } from "~/features/issuance/nitCheckDigit";
import { splitNit } from "~/features/issuance/schema";
import type { IssuerDetail } from "~/lib/api/types";

import { FieldFrame, TextField } from "./fields";
import { LocationFields } from "./LocationFields";
import type { IssuerValues } from "./schema";
import { FieldRow, FieldSection } from "./StepLayout";
import { isTaxLevelCode, nextTaxLevels, taxLevelItems } from "./taxLevels";

const personTypeOptions = [
  {
    value: "LEGAL_ENTITY",
    title: "Persona jurídica",
    description: "Una empresa o sociedad: SAS, LTDA, SA, fundación…",
  },
  {
    value: "NATURAL_PERSON",
    title: "Persona natural",
    description: "Una persona que factura a su nombre: profesional independiente o comerciante.",
  },
] as const;

const ivaOptions = [
  {
    value: "yes",
    title: "Sí, soy responsable de IVA",
    description: "Cobras IVA en tus ventas y lo declaras. En el RUT aparece la responsabilidad 48.",
  },
  {
    value: "no",
    title: "No soy responsable de IVA",
    description: "No cobras IVA. En el RUT aparece la responsabilidad 49, o ninguna de las dos.",
  },
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
  const personTypeLocked = issuer !== null && issuer.status !== "ONBOARDING";
  const personType = useWatch({ control: form.control, name: "personType" });

  return (
    <>
      <FieldSection
        title="¿Quién va a facturar?"
        lead="Escribe los datos tal como aparecen en el RUT: la DIAN los compara en cada factura."
      >
        <Controller
          name="personType"
          control={form.control}
          render={({ field }) => (
            <ChoiceField
              label="Tipo de persona"
              options={personTypeOptions}
              value={field.value}
              disabled={personTypeLocked}
              onChange={field.onChange}
              hint={
                personTypeLocked
                  ? "Viene con el NIT: no cambia una vez configurado el emisor."
                  : undefined
              }
              className="sm:grid-cols-2"
            />
          )}
        />
        <FieldRow className="sm:grid-cols-2">
          <NitField form={form} readOnly={issuer !== null} />
        </FieldRow>
        <FieldRow className="sm:grid-cols-2">
          <TextField
            control={form.control}
            name="legalName"
            label={personType === "NATURAL_PERSON" ? "Nombre completo" : "Razón social"}
            autoComplete="organization"
            hint={
              personType === "NATURAL_PERSON"
                ? "Como en el RUT: apellidos y luego nombres, por ejemplo PEREZ GOMEZ ANA MARIA."
                : "Como en el RUT, incluida la sigla de la sociedad, por ejemplo COMERCIAL ANDINA SAS."
            }
          />
          <Controller
            name="tradeName"
            control={form.control}
            render={({ field, fieldState }) => (
              <TradeNameField
                value={field.value ?? ""}
                invalid={fieldState.invalid}
                onBlur={field.onBlur}
                onChange={(value) => field.onChange(value.trim() ? value : null)}
              />
            )}
          />
        </FieldRow>
      </FieldSection>

      <Separator />

      <FieldSection
        title="Información tributaria"
        lead="La encuentras en la sección de responsabilidades del RUT (casilla 53)."
      >
        <Controller
          name="taxLevelCodes"
          control={form.control}
          render={({ field, fieldState }) => (
            <TaxLevelsField
              value={field.value}
              invalid={fieldState.invalid}
              error={fieldState.error}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          name="responsibleForIva"
          control={form.control}
          render={({ field }) => (
            <ChoiceField
              label="¿Eres responsable de IVA?"
              options={ivaOptions}
              value={field.value ? "yes" : "no"}
              onChange={(value) => field.onChange(value === "yes")}
              className="sm:grid-cols-2"
            />
          )}
        />
      </FieldSection>

      <Separator />

      <FieldSection
        title="Ubicación y contacto"
        lead="La dirección principal del RUT y el correo que verán tus clientes en las facturas."
      >
        <FieldRow className="sm:grid-cols-2">
          <LocationFields form={form} />
        </FieldRow>
        <FieldRow className="sm:grid-cols-[1fr_13rem]">
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
            maxLength={6}
            hint={
              <>
                Búscalo en{" "}
                <a href="https://visor.codigopostal.gov.co" target="_blank" rel="noreferrer">
                  codigopostal.gov.co
                </a>
                .
              </>
            }
          />
        </FieldRow>
        <FieldRow className="sm:grid-cols-2">
          <TextField
            control={form.control}
            name="email"
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            hint="Aparece en tus facturas como el correo del emisor."
          />
          <TextField
            control={form.control}
            name="phone"
            label="Teléfono"
            type="tel"
            autoComplete="tel"
            optional
          />
        </FieldRow>
      </FieldSection>
    </>
  );
}

/**
 * The NIT, with or without the verification digit the RUT shows next to it. The digit the DIAN
 * computes is shown so the person can compare it; the schema rejects one that does not match.
 */
function NitField({ form, readOnly }: { form: UseFormReturn<IssuerValues>; readOnly: boolean }) {
  const nit = useWatch({ control: form.control, name: "nit" });
  const parts = splitNit(nit);
  const checkDigit = parts && parts.nit.length >= 5 ? nitCheckDigit(parts.nit) : null;
  return (
    <TextField
      control={form.control}
      name="nit"
      label="NIT"
      inputMode="numeric"
      readOnly={readOnly}
      normalize={(value) => value.replace(/[^\d-]/g, "")}
      hint={
        readOnly
          ? "El NIT no cambia una vez creado el emisor."
          : checkDigit === null
            ? "Con o sin el dígito de verificación: lo calculamos por ti."
            : `Dígito de verificación: ${checkDigit}. Compáralo con el que aparece junto al NIT en el RUT.`
      }
    />
  );
}

function TradeNameField({
  value,
  invalid,
  onBlur,
  onChange,
}: {
  value: string;
  invalid: boolean;
  onBlur: () => void;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <FieldFrame
      id={id}
      label="Nombre comercial"
      optional
      invalid={invalid}
      hint="El nombre con el que te conocen tus clientes, si es distinto."
    >
      <Input
        id={id}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
      />
    </FieldFrame>
  );
}

function TaxLevelsField({
  value,
  invalid,
  error,
  onChange,
}: {
  value: IssuerValues["taxLevelCodes"];
  invalid: boolean;
  error?: { message?: string };
  onChange: (value: IssuerValues["taxLevelCodes"]) => void;
}) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm leading-snug font-medium">
        Responsabilidades tributarias
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {taxLevelItems.map((item) => {
          const checkboxId = `${id}-${item.value}`;
          return (
            <FieldLabel key={item.value} htmlFor={checkboxId}>
              <Field orientation="horizontal" size="sm">
                <Checkbox
                  id={checkboxId}
                  aria-invalid={invalid}
                  checked={value.includes(item.value)}
                  onCheckedChange={(checked) =>
                    onChange(
                      nextTaxLevels(
                        value,
                        checked
                          ? [...value, item.value]
                          : value.filter((code) => code !== item.value),
                      ),
                    )
                  }
                />
                <FieldContent>
                  <FieldTitle>{item.label}</FieldTitle>
                  <FieldDescription>Código {item.value}</FieldDescription>
                </FieldContent>
              </Field>
            </FieldLabel>
          );
        })}
      </div>
      {!invalid && (
        <FieldDescription size="sm">
          Marca las que aparecen en tu RUT. Si no tienes ninguna de estas, marca «No aplica».
        </FieldDescription>
      )}
      <FieldError errors={[error]} size="sm" />
    </fieldset>
  );
}
