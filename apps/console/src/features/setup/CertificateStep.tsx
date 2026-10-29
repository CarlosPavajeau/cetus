import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation } from "@tanstack/react-query";
import { FileKeyIcon, LockKeyholeIcon, TriangleAlertIcon } from "lucide-react";
import { useId, useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { FieldError } from "~/components/ui/field";
import { dayFormat } from "~/features/audit-log/labels";
import { useImpersonation } from "~/features/session/useImpersonation";
import type { IssuerDetail } from "~/lib/api/types";

import { CertificateDropzone } from "./CertificateDropzone";
import { SecretField } from "./fields";
import { certificateSchema } from "./schema";
import { setCertificate } from "./server";
import { FieldSection, SecretNotice, StepGuide, StepLayout } from "./StepLayout";

/** A certificate this close to its end should be renewed before the issuer starts invoicing. */
const expiringDays = 30;

function daysUntil(date: string) {
  return Math.floor((new Date(date).getTime() - Date.now()) / 86_400_000);
}

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
  const impersonation = useImpersonation();
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
      form.setError("root", {
        message: error instanceof Error ? error.message : "No pudimos guardar el certificado.",
      });
      return;
    }
    await onSaved();
  });

  async function keepSaved(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSaved();
  }

  const expiring = saved !== null && daysUntil(saved.validTo) < expiringDays;

  return (
    <StepLayout
      step={3}
      lead="Cetus firma cada factura con el certificado digital del emisor. Súbelo con su contraseña."
      error={errors.root?.message}
      submitting={isSubmitting}
      onSubmit={saved && !replacing ? keepSaved : save}
      onBack={onBack}
      guide={
        <StepGuide
          title="Tu certificado de firma"
          lead="Es un archivo .p12 o .pfx que te entrega una entidad de certificación digital acreditada por la ONAC, como Certicámara, GSE o Andes SCD."
          tips={[
            {
              title: "A nombre del emisor",
              text: "Debe estar emitido para el mismo NIT que registraste en el paso 1.",
            },
            {
              title: "Con su propia contraseña",
              text: "Es la que te dio la entidad al entregarte el certificado. No es la de Cetus ni la del portal de la DIAN.",
            },
            {
              title: "Lo verificamos al continuar",
              text: "Revisamos el archivo, la contraseña y la vigencia antes de guardarlo. No necesitas convertirlo.",
            },
          ]}
          note="El certificado se guarda cifrado y nunca se puede descargar desde la consola."
        />
      }
    >
      {saved && !replacing ? (
        <FieldSection title="Certificado guardado">
          <div className="flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <FileKeyIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-medium wrap-anywhere">{saved.subject}</p>
                <p className="text-xs text-muted-foreground">
                  Vigente del {dayFormat.format(new Date(saved.validFrom))} al{" "}
                  {dayFormat.format(new Date(saved.validTo))} · Serie {saved.serialNumber}
                </p>
              </div>
            </div>
            {!impersonation && (
              <Button type="button" variant="outline" onClick={() => setReplacing(true)}>
                Reemplazar certificado
              </Button>
            )}
          </div>
          {expiring && (
            <Alert>
              <TriangleAlertIcon />
              <AlertTitle>Este certificado vence pronto</AlertTitle>
              <AlertDescription>
                Renuévalo con tu entidad de certificación y reemplázalo aquí para no interrumpir la
                facturación.
              </AlertDescription>
            </Alert>
          )}
        </FieldSection>
      ) : impersonation ? (
        <Alert>
          <AlertTitle>El certificado lo carga el cliente</AlertTitle>
          <AlertDescription>
            Mientras ves la consola como otra persona no puedes cargar certificados. Desde la
            administración puedes generarle un enlace de carga.
          </AlertDescription>
        </Alert>
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
            <FieldError errors={[file.fieldState.error]} size="sm" className="-mt-2" />
          </FieldSection>
          <SecretField
            control={form.control}
            name="password"
            label="Contraseña del certificado"
            hint="La que recibiste junto con el archivo del certificado."
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
