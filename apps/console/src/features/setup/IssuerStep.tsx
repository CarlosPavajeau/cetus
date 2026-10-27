import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import type { IssuerDetail } from "~/lib/api/types";

import { IssuerFields, issuerDefaults } from "./IssuerFields";
import { issuerSchema } from "./schema";
import { createIssuer, updateIssuer } from "./server";
import { StepGuide, StepLayout } from "./StepLayout";

/**
 * Step 1: the tax data of the issuer, as it appears in its RUT. Creates the issuer the first time,
 * always in habilitación: production comes later, with «Pasar a producción».
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
  const form = useForm({
    resolver: arktypeResolver(issuerSchema),
    defaultValues: issuerDefaults(issuer),
  });
  const { isSubmitting, isDirty, errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (!issuer) {
        const created = await create.mutateAsync({ data: { issuer: values } });
        await onSaved(created.id);
      } else {
        if (isDirty) {
          await update.mutateAsync({ data: { id: issuer.id, issuer: values } });
        }
        await onSaved(issuer.id);
      }
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "No pudimos guardar el emisor.",
      });
    }
  });

  return (
    <StepLayout
      step={1}
      lead="Con tu RUT a la mano, completa los datos de quien va a emitir las facturas."
      error={errors.root?.message}
      submitting={isSubmitting}
      onSubmit={onSubmit}
      onBack={onBack}
      guide={
        <StepGuide
          title="Todo sale del RUT"
          lead="Descarga una copia reciente desde los servicios en línea de la DIAN y tenla abierta mientras llenas el formulario."
          numbered
          tips={[
            {
              title: "NIT y nombre",
              text: "Están en la primera hoja del RUT. Escribe el NIT sin el dígito de verificación; nosotros lo calculamos para que lo compares.",
            },
            {
              title: "Responsabilidades",
              text: "Están en la casilla 53. Solo marca las de la lista; si no tienes ninguna, marca «No aplica». Si aparece la 48, eres responsable de IVA.",
            },
            {
              title: "Dirección",
              text: "Usa la dirección principal registrada en el RUT. El correo que escribas aparece en tus facturas.",
            },
          ]}
          note={
            issuer?.environment === "LIVE"
              ? "Este es el emisor de producción: sus facturas tienen validez fiscal ante la DIAN."
              : "El emisor empieza en habilitación: sus documentos de prueba no tienen validez fiscal. Puedes corregir estos datos después."
          }
        />
      }
    >
      <IssuerFields form={form} issuer={issuer} />
    </StepLayout>
  );
}
