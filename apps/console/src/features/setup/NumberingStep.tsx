import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { dayFormat } from "~/features/audit-log/labels";
import type { IssuerDetail } from "~/lib/api/types";

import { portalCaptures } from "./dianPortal";
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
  const habilitacion = issuer.environment === "TEST";
  const add = useMutation({ mutationFn: addNumberingRange });
  const [editingRange, setEditingRange] = useState(false);
  const form = useForm({
    resolver: arktypeResolver(habilitacion ? habilitacionNumberingSchema : numberingSchema),
    defaultValues: habilitacion ? habilitacionRange : emptyRange,
  });
  const range = useWatch({ control: form.control });
  const { isSubmitting, errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await add.mutateAsync({ data: { id: issuer.id, range: values } });
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "No pudimos agregar el rango.",
      });
      return;
    }
    await onSaved();
  });

  const prefix = range.prefix?.toUpperCase() ?? "";
  // A rejected range opens its fields, or the error would stay hidden behind the summary.
  const rangeOpen =
    editingRange || Object.keys(errors).some((key) => key !== "technicalKey" && key !== "root");
  const technicalKey = (
    <SecretField
      control={form.control}
      name="technicalKey"
      label="Clave técnica"
      optional={!habilitacion}
      hint={habilitacion ? technicalKeyHint.TEST : technicalKeyHint.LIVE}
    />
  );
  const rangeFields = (
    <>
      <FieldRow className="sm:grid-cols-2">
        <TextField
          control={form.control}
          name="resolutionNumber"
          label="Número de resolución"
          inputMode="numeric"
        />
        <DateField control={form.control} name="resolutionDate" label="Fecha de resolución" />
      </FieldRow>
      <FieldRow>
        <TextField control={form.control} name="prefix" label="Prefijo" autoComplete="off" />
        <TextField control={form.control} name="from" label="Número inicial" inputMode="numeric" />
        <TextField control={form.control} name="to" label="Número final" inputMode="numeric" />
      </FieldRow>
      <FieldRow className="sm:grid-cols-2">
        <DateField control={form.control} name="validFrom" label="Vigencia desde" />
        <DateField control={form.control} name="validTo" label="Vigencia hasta" />
      </FieldRow>
    </>
  );

  return (
    <StepLayout
      step={4}
      lead={
        habilitacion
          ? "La DIAN asigna a todo set de pruebas el mismo rango de numeración. Solo te falta copiar su clave técnica."
          : "Registra la resolución de facturación que la DIAN autorizó para este emisor."
      }
      error={errors.root?.message}
      submitting={isSubmitting}
      onSubmit={onSubmit}
      onBack={onBack}
      guide={
        <>
          {!habilitacion && (
            <div className="flex flex-col gap-4 rounded-lg border bg-card p-5">
              <p className="text-base font-medium">Tus facturas se numerarán</p>
              <div className="flex flex-col gap-1.5 tabular-nums">
                <p className="text-lg">
                  {prefix} {range.from || "—"}
                </p>
                <p className="text-xs text-muted-foreground">hasta</p>
                <p className="text-lg">
                  {prefix} {range.to || "—"}
                </p>
              </div>
              <div className="h-px bg-border" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Resolución {range.resolutionNumber || "—"}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Vigencia: {isoDay(range.validFrom)} a {isoDay(range.validTo)}
              </p>
            </div>
          )}
          {habilitacion ? (
            <StepGuide
              title="¿Dónde está la clave técnica?"
              lead="En el portal de habilitación de la DIAN, con el mismo usuario del paso 2."
              numbered
              tips={[
                {
                  title: "Abre tu software",
                  text: "En «Configurar modos de operación», búscalo en «Listado de modos de operación asociados».",
                },
                {
                  title: "Consulta sus rangos de prueba",
                  text: "El ícono de «Rangos de prueba» muestra el rango con prefijo SETP y su «Llave técnica»: una cadena larga de letras y números. Cópiala completa.",
                  capture: portalCaptures.testRanges,
                },
              ]}
              note="Guardar conserva la configuración en Cetus. Al terminar, envías el set de pruebas desde la página del emisor."
            />
          ) : (
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
          )}
        </>
      }
    >
      {habilitacion ? (
        <>
          <FieldSection
            title="Clave técnica del set de pruebas"
            lead="Es el único dato que cambia de un software a otro."
          >
            {technicalKey}
          </FieldSection>
          <Separator />
          <FieldSection
            title="Rango del set de pruebas"
            lead="Asignado por la DIAN a todos los sets de pruebas. No necesitas cambiarlo."
          >
            {rangeOpen ? (
              rangeFields
            ) : (
              <div className="flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                  <RangeItem label="Resolución" value={range.resolutionNumber} />
                  <RangeItem label="Prefijo" value={prefix} />
                  <RangeItem label="Números" value={`${range.from} a ${range.to}`} />
                </dl>
                <Button type="button" variant="ghost" onClick={() => setEditingRange(true)}>
                  Editar rango
                </Button>
              </div>
            )}
          </FieldSection>
        </>
      ) : (
        <>
          <FieldSection title="Resolución de facturación" lead="Para facturas electrónicas.">
            {rangeFields}
          </FieldSection>
          <Separator />
          {technicalKey}
        </>
      )}
    </StepLayout>
  );
}

/** A YYYY-MM-DD from the form, as the certificate step shows dates. Noon UTC is the same day in Bogotá. */
function isoDay(value: string | undefined) {
  return value ? dayFormat.format(new Date(`${value}T12:00:00Z`)) : "—";
}

function RangeItem({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value || "—"}</dd>
    </div>
  );
}
