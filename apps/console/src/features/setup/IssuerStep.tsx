import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import type { IssuerDetail } from "~/lib/api/types";

import { IssuerFields, issuerDefaults } from "./IssuerFields";
import { issuerSchema } from "./schema";
import { createIssuer, updateIssuer } from "./server";
import { StepGuide, StepLayout } from "./StepLayout";

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
  const create = useMutation({ mutationFn: createIssuer });
  const update = useMutation({ mutationFn: updateIssuer });
  const form = useForm({
    resolver: arktypeResolver(issuerSchema),
    defaultValues: issuerDefaults(issuer),
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
      <IssuerFields form={form} issuer={issuer} />
    </StepLayout>
  );
}
