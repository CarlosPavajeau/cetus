import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation } from "@tanstack/react-query";
import { LockKeyholeIcon } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import type { IssuerDetail } from "~/lib/api/types";
import { uuidPattern } from "~/lib/utils";

import { SecretField, TextField } from "./fields";
import { softwareSchema } from "./schema";
import { setSoftware } from "./server";
import { FieldSection, SecretNotice, StepGuide, StepLayout } from "./StepLayout";

/** The DIAN portal where an issuer registers its software and finds its test set. */
const habilitacionPortal = "https://catalogo-vpfe-hab.dian.gov.co";

/** IDs copied from the portal often bring spaces or a line break along. */
const trimmed = (value: string) => value.trim();

function uuidHint(value: string, fallback: string) {
  return uuidPattern.test(value) ? "Formato correcto." : fallback;
}

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
    mode: "onTouched",
    resolver: arktypeResolver(softwareSchema),
    defaultValues: {
      softwareId: issuer.software?.softwareId ?? "",
      pin: "",
      testSetId: issuer.software?.testSetId ?? "",
    },
  });
  const { isSubmitting, isDirty, errors } = form.formState;
  const [softwareId, testSetId] = useWatch({
    control: form.control,
    name: ["softwareId", "testSetId"],
  });

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
        form.setError("root", {
          message: error instanceof Error ? error.message : "No pudimos guardar el software.",
        });
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
          ? "Registra a Cetus como tu software de facturación en el portal de la DIAN y copia aquí los datos que te entrega."
          : "Revisa las credenciales del software con el que facturarás en producción."
      }
      error={errors.root?.message}
      submitting={isSubmitting}
      onSubmit={onSubmit}
      onBack={onBack}
      guide={
        habilitacion ? (
          <StepGuide
            title="En el portal de la DIAN"
            lead="Ingresa al portal de habilitación de facturación electrónica con el usuario del emisor."
            numbered
            tips={[
              {
                title: "Abre los modos de operación",
                text: "En el menú de habilitación, elige «Configurar modos de operación».",
              },
              {
                title: "Registra un software propio",
                text: "Selecciona «Software propio», ponle un nombre (por ejemplo, Cetus) y define un PIN que recuerdes. Guarda.",
              },
              {
                title: "Copia el Software ID y el TestSetId",
                text: "Aparecen en el detalle del software que acabas de asociar. Pégalos aquí junto con el PIN que definiste.",
              },
            ]}
            link={{ href: habilitacionPortal, label: "Abrir el portal de habilitación" }}
            note="Los nombres de los menús pueden cambiar en el portal de la DIAN."
          />
        ) : (
          <StepGuide
            title="El software de producción"
            lead="Usa el software registrado para este emisor en el portal de facturación electrónica de producción."
            tips={[
              {
                title: "Software ID y PIN",
                text: "Son los del software con el que pasaste a producción. Conserva los valores completos.",
              },
            ]}
            note="Los nombres y la ubicación de las opciones pueden variar en el portal de la DIAN."
          />
        )
      }
    >
      <FieldSection title="Credenciales del software">
        <TextField
          control={form.control}
          name="softwareId"
          label="Software ID"
          spellCheck={false}
          autoComplete="off"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          normalize={trimmed}
          hint={uuidHint(softwareId, "Tiene 36 caracteres, con guiones. Cópialo completo.")}
        />
        <SecretField
          control={form.control}
          name="pin"
          label="PIN del software"
          placeholder={configured ? "••••• (guardado)" : undefined}
          hint={
            configured
              ? "Ya está guardado. Escríbelo de nuevo solo si deseas reemplazarlo."
              : "El PIN que definiste al registrar el software en la DIAN."
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
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            normalize={trimmed}
            hint={uuidHint(
              testSetId,
              "Identifica tu set de pruebas. Déjalo vacío solo si ya lo terminaste.",
            )}
          />
        )}
      </FieldSection>
      <SecretNotice
        icon={<LockKeyholeIcon />}
        title="El PIN es un dato secreto."
        text="Mantenlo oculto y no lo compartas en mensajes o capturas de pantalla."
      />
      <p className="text-xs text-muted-foreground">
        Ingresar estas credenciales no confirma una conexión ni una validación con la DIAN.
      </p>
    </StepLayout>
  );
}
