import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation } from "@tanstack/react-query";
import { LockKeyholeIcon } from "lucide-react";
import { useForm } from "react-hook-form";

import type { IssuerDetail } from "~/lib/api/types";

import { SecretField, TextField } from "./fields";
import { softwareSchema } from "./schema";
import { setSoftware } from "./server";
import { FieldSection, SecretNotice, StepGuide, StepLayout } from "./StepLayout";

/** Step 2: the Software ID, PIN and TestSetId copied from the DIAN habilitación portal. */
export function SoftwareStep({
  issuer,
  onBack,
  onSaved,
}: {
  issuer: IssuerDetail;
  onBack: () => void;
  onSaved: () => Promise<void>;
}) {
  const configured = issuer.software !== null;
  const habilitacion = issuer.environment === "TEST";
  const save = useMutation({ mutationFn: setSoftware });
  const form = useForm({
    resolver: arktypeResolver(softwareSchema),
    defaultValues: {
      softwareId: issuer.software?.softwareId ?? "",
      pin: "",
      testSetId: issuer.software?.testSetId ?? "",
    },
  });
  const { isSubmitting, isDirty, errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    // The API never returns the PIN: saved credentials are kept unless the person changes them.
    if (!configured || isDirty) {
      if (!values.pin.trim()) {
        form.setError("pin", { message: "Escribe el PIN del software." });
        return;
      }
      try {
        await save.mutateAsync({ data: { id: issuer.id, software: values } });
      } catch (error) {
        form.setError("root", { message: (error as Error).message });
        return;
      }
    }
    await onSaved();
  });

  return (
    <StepLayout
      step={2}
      lead={
        habilitacion
          ? "Copia las credenciales de tu software desde el portal de habilitación de la DIAN."
          : "Revisa las credenciales del software con el que facturarás en producción."
      }
      error={errors.root?.message}
      submitting={isSubmitting}
      onSubmit={onSubmit}
      onBack={onBack}
      guide={
        <StepGuide
          title="¿Dónde encuentro estos datos?"
          lead="Ten acceso al portal de habilitación de facturación electrónica de la DIAN."
          tips={[
            {
              title: "1. Identifica tu software",
              text: "Consulta la información del software que registraste para este emisor.",
            },
            {
              title: "2. Copia sus credenciales",
              text: "Localiza el Software ID y el PIN del software. Conserva los valores completos.",
            },
            ...(habilitacion
              ? [
                  {
                    title: "3. Ubica el set de pruebas",
                    text: "Si aún no terminas el set de pruebas, copia su identificador en TestSetId. Si ya lo terminaste, déjalo vacío.",
                  },
                ]
              : []),
          ]}
          note="Los nombres y la ubicación de las opciones pueden variar en el portal DIAN."
        />
      }
      after={
        <div className="flex flex-col gap-1.5 pt-4 text-muted-foreground">
          <p className="text-2xs">
            {issuer.legalName} · NIT {issuer.nit}
          </p>
          <p className="text-[10px]">
            Estas credenciales corresponden al emisor que configuraste en el paso anterior.
          </p>
        </div>
      }
    >
      <FieldSection title="Credenciales del software">
        <TextField
          control={form.control}
          name="softwareId"
          label="Software ID"
          spellCheck={false}
          autoComplete="off"
          hint="Identificador del software registrado en la DIAN."
        />
        <SecretField
          control={form.control}
          name="pin"
          label="PIN del software"
          placeholder={configured ? "••••• (guardado)" : undefined}
          hint={
            configured
              ? "Ya está guardado. Escríbelo de nuevo solo si deseas reemplazarlo."
              : "Ingresa el PIN asociado a ese mismo software."
          }
        />
        {/* Production has no test set. */}
        {habilitacion && (
          <TextField
            control={form.control}
            name="testSetId"
            label="TestSetId / ID del set de pruebas"
            spellCheck={false}
            autoComplete="off"
            hint="Opcional: déjalo vacío si ya terminaste el set de pruebas."
          />
        )}
      </FieldSection>
      <SecretNotice
        icon={<LockKeyholeIcon />}
        title="El PIN es un dato secreto."
        text="Mantenlo oculto y no lo compartas en mensajes o capturas de pantalla."
      />
      <p className="text-2xs text-muted-foreground">
        Ingresar estas credenciales no confirma una conexión ni una validación con la DIAN.
      </p>
    </StepLayout>
  );
}
