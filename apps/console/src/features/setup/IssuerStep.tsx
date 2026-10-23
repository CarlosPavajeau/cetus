import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "~/components/ui/field";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Separator } from "~/components/ui/separator";
import type { DianEnvironment, IssuerDetail } from "~/lib/api/types";

import { IssuerFields, issuerDefaults } from "./IssuerFields";
import { issuerSchema } from "./schema";
import { createIssuer, updateIssuer } from "./server";
import { FieldSection, StepGuide, StepLayout } from "./StepLayout";

const startingPoints = [
  {
    value: "TEST",
    title: "Empiezo la habilitación en la DIAN",
    description:
      "Tu software aún no está habilitado: Cetus te acompaña en el set de pruebas antes de pasar a producción.",
  },
  {
    value: "LIVE",
    title: "Ya facturo electrónicamente con este software",
    description:
      "El Software ID y el PIN que usarás ya están habilitados en producción para este emisor. Si hoy facturas con un proveedor tecnológico, empieza la habilitación.",
  },
] as const;

/**
 * Step 1: the tax data of the issuer, as it appears in its RUT. Creates the issuer the first time,
 * in habilitación or, when its software is already enabled at the DIAN, directly in production.
 */
export function IssuerStep({
  issuer,
  onBack,
  onSaved,
}: {
  issuer: IssuerDetail | null;
  onBack: () => void;
  onSaved: (issuerId: string) => Promise<void>;
}) {
  const create = useMutation({ mutationFn: createIssuer });
  const update = useMutation({ mutationFn: updateIssuer });
  const [environment, setEnvironment] = useState<DianEnvironment>("TEST");
  const form = useForm({
    resolver: arktypeResolver(issuerSchema),
    defaultValues: issuerDefaults(issuer),
  });
  const { isSubmitting, isDirty, errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (!issuer) {
        const created = await create.mutateAsync({ data: { environment, issuer: values } });
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
              text: "Elige las que aparecen en la casilla 53 de tu RUT. Si no tienes ninguna, elige R-99-PN.",
            },
            {
              title: "Ubicación sin complicaciones",
              text: "Los códigos geográficos acompañan a cada ubicación para ayudarte a revisar la correspondencia.",
            },
          ]}
          note={
            issuer?.environment === "LIVE"
              ? "Este es el emisor de producción: sus facturas tienen validez fiscal ante la DIAN."
              : issuer
                ? "Este emisor está en habilitación: sus documentos no tienen validez fiscal."
                : "El punto de partida no cambia después: un emisor en habilitación pasa a producción con «Pasar a producción»."
          }
        />
      }
    >
      {!issuer && (
        <>
          <FieldSection title="Punto de partida">
            <RadioGroup
              value={environment}
              onValueChange={(value) => setEnvironment(value as DianEnvironment)}
              className="sm:grid-cols-2"
            >
              {startingPoints.map((option) => (
                <FieldLabel key={option.value} htmlFor={`environment-${option.value}`}>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle className="text-xs">{option.title}</FieldTitle>
                      <FieldDescription className="text-[10px]">
                        {option.description}
                      </FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value={option.value} id={`environment-${option.value}`} />
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </FieldSection>
          <Separator />
        </>
      )}
      <IssuerFields form={form} issuer={issuer} />
    </StepLayout>
  );
}
