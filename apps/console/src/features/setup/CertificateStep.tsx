import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation } from "@tanstack/react-query";
import { FileKeyIcon, LockKeyholeIcon } from "lucide-react";
import { useId, useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";

import { Button } from "~/components/ui/button";
import { FieldError } from "~/components/ui/field";
import { dayFormat } from "~/features/audit-log/labels";
import type { IssuerDetail } from "~/lib/api/types";

import { CertificateDropzone } from "./CertificateDropzone";
import { SecretField } from "./fields";
import { certificateSchema } from "./schema";
import { setCertificate } from "./server";
import { FieldSection, SecretNotice, StepGuide, StepLayout } from "./StepLayout";

/** Step 3: the issuer's .p12 signing certificate and its password. */
export function CertificateStep({
  issuer,
  onBack,
  onSaved,
}: {
  issuer: IssuerDetail;
  onBack: () => void;
  onSaved: () => Promise<void>;
}) {
  const fileId = useId();
  const saved = issuer.certificate;
  const [replacing, setReplacing] = useState(saved === null);
  const upload = useMutation({ mutationFn: setCertificate });
  const form = useForm({
    resolver: arktypeResolver(certificateSchema),
    defaultValues: { fileName: "", pkcs12Base64: "", password: "" },
  });
  const file = useController({ control: form.control, name: "pkcs12Base64" });
  const fileName = useWatch({ control: form.control, name: "fileName" });
  const { isSubmitting, errors } = form.formState;

  const save = form.handleSubmit(async (values) => {
    try {
      await upload.mutateAsync({ data: { id: issuer.id, certificate: values } });
    } catch (error) {
      form.setError("root", { message: (error as Error).message });
      return;
    }
    await onSaved();
  });

  async function keepSaved(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSaved();
  }

  const review =
    saved && !replacing
      ? `Certificado verificado: vigente hasta el ${dayFormat.format(new Date(saved.validTo))}.`
      : fileName
        ? "Al continuar, Cetus verificará el archivo, su contraseña y su vigencia."
        : "No hay un archivo seleccionado. Su contenido y vigencia no se han verificado.";

  return (
    <StepLayout
      step={3}
      lead="Selecciona tu certificado digital en formato .p12 e ingresa su contraseña."
      error={errors.root?.message}
      submitting={isSubmitting}
      onSubmit={saved && !replacing ? keepSaved : save}
      onBack={onBack}
      guide={
        <StepGuide
          title="El certificado firma tus documentos"
          lead="Necesitas el archivo .p12 del emisor y la contraseña que lo acompaña."
          tips={[
            {
              title: "Selecciona el archivo original",
              text: "Si no lo tienes, solicítalo a quien te suministró el certificado digital.",
            },
            {
              title: "Usa su contraseña",
              text: "No es la contraseña de Cetus ni la de tu cuenta en el portal DIAN.",
            },
            {
              title: saved && !replacing ? "Ya revisado" : "Aún no se ha revisado",
              text: review,
            },
          ]}
          note="Solo necesitas seleccionar el archivo .p12; no debes convertirlo ni pegar su contenido."
        />
      }
    >
      {saved && !replacing ? (
        <FieldSection title="Certificado guardado">
          <div className="flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <FileKeyIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-xs font-medium">{saved.subject}</p>
                <p className="text-2xs text-muted-foreground">
                  Vigente del {dayFormat.format(new Date(saved.validFrom))} al{" "}
                  {dayFormat.format(new Date(saved.validTo))} · Serie {saved.serialNumber}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => setReplacing(true)}>
              Reemplazar certificado
            </Button>
          </div>
        </FieldSection>
      ) : (
        <>
          <FieldSection title="Archivo del certificado">
            <CertificateDropzone
              id={fileId}
              fileName={fileName}
              invalid={file.fieldState.invalid}
              onSelect={(selected) => {
                form.setValue("fileName", selected.fileName);
                file.field.onChange(selected.pkcs12Base64);
                form.clearErrors();
              }}
              onError={(message) => form.setError("pkcs12Base64", { message })}
            />
            <FieldError errors={[file.fieldState.error]} className="-mt-2 text-[10px]" />
          </FieldSection>
          <SecretField
            control={form.control}
            name="password"
            label="Contraseña del certificado"
            hint="Usa la contraseña que recibiste con tu certificado digital."
          />
          {saved && (
            <Button
              type="button"
              variant="ghost"
              className="self-start"
              onClick={() => {
                setReplacing(false);
                form.reset();
              }}
            >
              Conservar el certificado guardado
            </Button>
          )}
        </>
      )}
      <SecretNotice
        icon={<LockKeyholeIcon />}
        title="Tu archivo y su contraseña son sensibles."
        text="No compartas el certificado ni su contraseña con personas no autorizadas."
      />
    </StepLayout>
  );
}
