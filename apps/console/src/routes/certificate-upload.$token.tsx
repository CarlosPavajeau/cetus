import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2Icon, LockKeyholeIcon } from "lucide-react";
import { useId } from "react";
import { useController, useForm, useWatch } from "react-hook-form";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { FieldError, FieldGroup } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { dayFormat, timeFormat } from "~/features/audit-log/labels";
import {
  getCertificateUploadLink,
  uploadCertificateWithLink,
} from "~/features/certificate-upload/server";
import { CertificateDropzone } from "~/features/setup/CertificateDropzone";
import { SecretField } from "~/features/setup/fields";
import { certificateSchema } from "~/features/setup/schema";

/**
 * Where a customer (or their accountant) uploads an issuer's .p12 from a link the Cetus team sent. No
 * account needed: the link is the credential, works once and expires in 48 hours.
 */
export const Route = createFileRoute("/certificate-upload/$token")({
  loader: ({ params }) => getCertificateUploadLink({ data: { token: params.token } }),
  head: () => ({ meta: [{ name: "referrer", content: "no-referrer" }] }),
  component: CertificateUpload,
});

function CertificateUpload() {
  const link = Route.useLoaderData();
  const { token } = Route.useParams();

  if (!link) {
    return (
      <AuthLayout title="Enlace no válido" lead="Este enlace de carga de certificado ya no sirve.">
        <Alert>
          <AlertDescription>
            Venció, ya se usó o se generó uno más reciente. Pide un enlace nuevo a quien te lo
            envió.
          </AlertDescription>
        </Alert>
      </AuthLayout>
    );
  }

  const expiresAt = new Date(link.expiresAt);
  return (
    <AuthLayout
      title="Carga el certificado"
      lead={`Para ${link.legalName} (NIT ${link.nit}), ${link.environment === "TEST" ? "en habilitación" : "en producción"}. El enlace vence el ${dayFormat.format(expiresAt)} a las ${timeFormat.format(expiresAt)}.`}
    >
      <UploadForm token={token} />
    </AuthLayout>
  );
}

function UploadForm({ token }: { token: string }) {
  const fileId = useId();
  const upload = useMutation({ mutationFn: uploadCertificateWithLink });
  const form = useForm({
    resolver: arktypeResolver(certificateSchema),
    defaultValues: { fileName: "", pkcs12Base64: "", password: "" },
  });
  const file = useController({ control: form.control, name: "pkcs12Base64" });
  const fileName = useWatch({ control: form.control, name: "fileName" });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (certificate) => {
    try {
      await upload.mutateAsync({ data: { token, certificate } });
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "No pudimos guardar el certificado.",
      });
    }
  });

  if (upload.isSuccess) {
    return (
      <Alert>
        <CheckCircle2Icon />
        <AlertTitle>Certificado guardado</AlertTitle>
        <AlertDescription>
          {upload.data.subject} · vigente hasta el {dayFormat.format(new Date(upload.data.validTo))}
          . Ya puedes cerrar esta página.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <div className="flex flex-col gap-2">
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
          <FieldError errors={[file.fieldState.error]} className="text-3xs" />
        </div>
        <SecretField
          control={form.control}
          name="password"
          label="Contraseña del certificado"
          hint="La que recibiste con tu certificado digital, no la de tu cuenta en la DIAN."
        />
        {errors.root && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" className="h-11" disabled={isSubmitting}>
          {isSubmitting && <Spinner data-icon="inline-start" />}
          {isSubmitting ? "Verificando…" : "Guardar certificado"}
        </Button>
        <p className="flex items-start gap-2 text-2xs text-muted-foreground">
          <LockKeyholeIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Cetus guarda el archivo y su contraseña cifrados y solo los usa para firmar los documentos
          de este emisor. Nadie, ni el equipo de Cetus, puede descargarlos.
        </p>
      </FieldGroup>
    </form>
  );
}
