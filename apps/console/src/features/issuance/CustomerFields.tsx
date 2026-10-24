import { useId } from "react";
import { Controller, type UseFormReturn, useWatch } from "react-hook-form";

import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldLabel } from "~/components/ui/field";
import { TextField } from "~/features/setup/fields";
import { FieldRow } from "~/features/setup/StepLayout";

import { identificationTypes, personTypes } from "./catalogs";
import { SelectField, TaxLevelsField } from "./fields";
import { MunicipalityField } from "./MunicipalityField";
import { nitCheckDigit } from "./nitCheckDigit";
import { type CustomerValues, splitNit } from "./schema";

/** The customer's fields, as an invoice and the catalog ask for them. */
export function CustomerFields({
  form,
  emailHint,
}: {
  form: UseFormReturn<CustomerValues>;
  emailHint?: string;
}) {
  const ivaId = useId();
  const identificationType = useWatch({ control: form.control, name: "identificationType" });
  const identificationNumber = useWatch({ control: form.control, name: "identificationNumber" });
  const nit = identificationType === "NIT" ? splitNit(identificationNumber) : null;
  const checkDigit = nit ? nitCheckDigit(nit.nit) : null;

  return (
    <>
      <FieldRow>
        <SelectField
          control={form.control}
          name="personType"
          label="Tipo de persona"
          items={personTypes}
        />
        <SelectField
          control={form.control}
          name="identificationType"
          label="Documento"
          items={identificationTypes}
        />
        <TextField
          control={form.control}
          name="identificationNumber"
          label="Número"
          hint={
            checkDigit === null
              ? undefined
              : `Dígito de verificación: ${checkDigit}${nit?.checkDigit ? "" : " (lo calculamos por ti)"}`
          }
          autoComplete="off"
        />
      </FieldRow>
      <FieldRow className="sm:grid-cols-2">
        <TextField
          control={form.control}
          name="legalName"
          label="Nombre o razón social"
          autoComplete="off"
        />
        <TextField
          control={form.control}
          name="email"
          label="Correo (opcional)"
          type="email"
          hint={emailHint}
          autoComplete="off"
        />
      </FieldRow>
      <FieldRow className="sm:grid-cols-2">
        <TaxLevelsField control={form.control} />
      </FieldRow>
      <FieldRow className="sm:grid-cols-[1fr_1fr_auto]">
        <MunicipalityField form={form} />
        <TextField
          control={form.control}
          name="line"
          label="Dirección (opcional)"
          hint="Va junto con el municipio: indica los dos o ninguno."
          autoComplete="off"
        />
        <Controller
          control={form.control}
          name="responsibleForIva"
          render={({ field }) => (
            <Field orientation="horizontal" className="gap-2 sm:pt-7">
              <Checkbox
                id={ivaId}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked)}
                onBlur={field.onBlur}
              />
              <FieldLabel htmlFor={ivaId} className="text-xs font-normal">
                Responsable de IVA
              </FieldLabel>
            </Field>
          )}
        />
      </FieldRow>
    </>
  );
}
