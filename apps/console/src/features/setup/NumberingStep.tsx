import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";

import { FieldDescription } from "~/components/ui/field";
import { Separator } from "~/components/ui/separator";
import type { IssuerDetail } from "~/lib/api/types";

import { DateField, SecretField, TextField } from "./fields";
import { habilitacionNumberingSchema, type NumberingValues, numberingSchema } from "./schema";
import { addNumberingRange } from "./server";
import { FieldRow, FieldSection, StepGuide, StepLayout } from "./StepLayout";

/**
 * The numbering the DIAN assigns to every habilitación test set. Only the technical key changes
 * from one software to another, so it is the one value left for the person to copy.
 */
export const habilitacionRange: NumberingValues = {
  resolutionNumber: "18760000001",
  resolutionDate: "2019-01-19",
  prefix: "SETP",
  from: "990000000",
  to: "995000000",
  validFrom: "2019-01-19",
  validTo: "2030-01-19",
  technicalKey: "",
};

/** Production numbering is the issuer's own resolution: nothing comes filled in. */
export const emptyRange: NumberingValues = {
  resolutionNumber: "",
  resolutionDate: "",
  prefix: "",
  from: "",
  to: "",
  validFrom: "",
  validTo: "",
  technicalKey: "",
};

/** Production leaves the key empty: the DIAN portal does not show it, and the range verification brings it. */
export const technicalKeyHint = {
  TEST: "Copia la clave técnica asociada a esta resolución. Mantén este valor privado.",
  LIVE: "Déjala vacía: Cetus la consulta a la DIAN al guardar el rango. No es el código del software.",
};

/** Step 4: the resolution and the invoice numbering range. Saving it completes the setup. */
export function NumberingStep({
  issuer,
  onBack,
  onSaved,
}: {
  issuer: IssuerDetail;
  onBack: () => void;
  onSaved: () => Promise<void>;
}) {
  const add = useMutation({ mutationFn: addNumberingRange });
  const form = useForm({
    resolver: arktypeResolver(
      issuer.environment === "TEST" ? habilitacionNumberingSchema : numberingSchema,
    ),
    defaultValues: issuer.environment === "TEST" ? habilitacionRange : emptyRange,
  });
  const range = useWatch({ control: form.control });
  const { isSubmitting, errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await add.mutateAsync({ data: { id: issuer.id, range: values } });
    } catch (error) {
      form.setError("root", { message: (error as Error).message });
      return;
    }
    await onSaved();
  });

  const prefix = range.prefix?.toUpperCase() ?? "";
  return (
    <StepLayout
      step={4}
      lead="Registra la resolución y el rango de numeración que utilizará este emisor."
      error={errors.root?.message}
      submitting={isSubmitting}
      onSubmit={onSubmit}
      onBack={onBack}
      guide={
        <>
          <div className="flex flex-col gap-4 rounded-lg border bg-card p-5">
            <p className="text-sm font-medium">Tu rango de numeración</p>
            <p className="text-2xs text-muted-foreground">Factura electrónica · INVOICE</p>
            <div className="flex flex-col gap-1.5 tabular-nums">
              <p className="text-[17px]">
                {prefix} {range.from || "—"}
              </p>
              <p className="text-2xs text-muted-foreground">hasta</p>
              <p className="text-[17px]">
                {prefix} {range.to || "—"}
              </p>
            </div>
            <div className="h-px bg-border" />
            <p className="text-2xs leading-relaxed text-muted-foreground">
              Resolución {range.resolutionNumber || "—"}
            </p>
            <p className="text-2xs leading-relaxed text-muted-foreground">
              Vigencia: {range.validFrom || "—"} a {range.validTo || "—"}
            </p>
          </div>
          <StepGuide
            title="Antes de finalizar"
            lead="Compara estos datos con tu resolución de numeración."
            tips={[
              {
                title: "Revisa el rango completo",
                text: "Confirma el prefijo, los números inicial y final y las fechas de vigencia.",
              },
            ]}
            note="Guardar conserva la configuración en Cetus. No confirma la autorización ni la validación de la DIAN."
          />
        </>
      }
    >
      <FieldSection title="Resolución">
        <div className="flex flex-col gap-1.75">
          <p className="text-xs font-medium">Tipo de documento</p>
          <div className="flex h-9 items-center gap-2.5 rounded-lg border px-3">
            <span
              className="flex size-3.25 items-center justify-center rounded-full border border-primary"
              aria-hidden
            >
              <span className="size-1.25 rounded-full bg-primary" />
            </span>
            <span className="text-xs">Factura electrónica</span>
          </div>
          <FieldDescription className="text-[10px]">Código del documento: INVOICE</FieldDescription>
        </div>
        <FieldRow className="sm:grid-cols-2">
          <TextField
            control={form.control}
            name="resolutionNumber"
            label="Número de resolución"
            inputMode="numeric"
          />
          <DateField control={form.control} name="resolutionDate" label="Fecha de resolución" />
        </FieldRow>
      </FieldSection>

      <Separator />

      <FieldSection title="Rango y vigencia">
        <FieldRow>
          <TextField control={form.control} name="prefix" label="Prefijo" autoComplete="off" />
          <TextField
            control={form.control}
            name="from"
            label="Número inicial"
            inputMode="numeric"
          />
          <TextField control={form.control} name="to" label="Número final" inputMode="numeric" />
        </FieldRow>
        <FieldRow className="sm:grid-cols-2">
          <DateField control={form.control} name="validFrom" label="Vigencia desde" />
          <DateField control={form.control} name="validTo" label="Vigencia hasta" />
        </FieldRow>
      </FieldSection>

      <Separator />

      <SecretField
        control={form.control}
        name="technicalKey"
        label={issuer.environment === "TEST" ? "Clave técnica" : "Clave técnica (opcional)"}
        hint={issuer.environment === "TEST" ? technicalKeyHint.TEST : technicalKeyHint.LIVE}
      />
    </StepLayout>
  );
}
