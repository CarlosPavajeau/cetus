import { arktypeResolver } from "@hookform/resolvers/arktype";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ShieldCheckIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { QRCode } from "react-qr-code";

import { CopyButton } from "~/components/CopyButton";
import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { PasswordInput } from "~/features/auth/PasswordInput";
import { enableTwoFactorSchema, verifyTotpSchema } from "~/features/auth/schema";
import { authClient } from "~/lib/auth/client";

type SecuritySearch = { required?: true };

/** Two-factor authentication of the signed-in user. Mandatory for the Cetus team. */
export const Route = createFileRoute("/_app/settings/security")({
  validateSearch: (search: Record<string, unknown>): SecuritySearch =>
    search.required === true || search.required === "true" ? { required: true } : {},
  loader: () => ({ crumb: "Seguridad" }),
  component: Security,
});

type Enrollment = { totpURI: string; backupCodes: string[] };

function Security() {
  const { session } = Route.useRouteContext();
  const { required } = Route.useSearch();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const enabled = session.user.twoFactorEnabled;

  return (
    <>
      <PageHeader
        title="Seguridad"
        status={
          enabled ? (
            <Badge variant="secondary">
              <ShieldCheckIcon data-icon="inline-start" />
              2FA activa
            </Badge>
          ) : undefined
        }
        lead="Protege tu cuenta con un código de una aplicación de autenticación además de tu contraseña."
      />
      {required && !enabled && (
        <Alert>
          <AlertTitle>Activa la verificación en dos pasos para continuar</AlertTitle>
          <AlertDescription>
            La administración de Cetus solo está disponible para cuentas con verificación en dos
            pasos.
          </AlertDescription>
        </Alert>
      )}
      {backupCodes ? (
        <BackupCodes codes={backupCodes} />
      ) : enrollment ? (
        <VerifyEnrollment
          enrollment={enrollment}
          onVerified={() => {
            setBackupCodes(enrollment.backupCodes);
            setEnrollment(null);
          }}
        />
      ) : enabled ? (
        <DisableTwoFactor />
      ) : (
        <EnableTwoFactor onEnrolled={setEnrollment} />
      )}
    </>
  );
}

function EnableTwoFactor({ onEnrolled }: { onEnrolled: (enrollment: Enrollment) => void }) {
  const form = useForm({
    resolver: arktypeResolver(enableTwoFactorSchema),
    defaultValues: { password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    const { data, error } = await authClient.twoFactor.enable({ password });
    if (error || !data || !("totpURI" in data)) {
      form.setError("root", {
        message:
          error?.code === "INVALID_PASSWORD"
            ? "La contraseña no coincide."
            : "No pudimos iniciar la activación. Intenta de nuevo.",
      });
      return;
    }
    onEnrolled({ totpURI: data.totpURI, backupCodes: data.backupCodes });
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Verificación en dos pasos</CardTitle>
        <CardDescription>
          Confirma tu contraseña para empezar. Necesitarás una aplicación como Google Authenticator,
          1Password o Authy.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent>
          <FieldGroup>
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="enable-2fa-password">Contraseña</FieldLabel>
                  <PasswordInput
                    {...field}
                    id="enable-2fa-password"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            {errors.root && (
              <Alert variant="destructive">
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            Activar verificación en dos pasos
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function VerifyEnrollment({
  enrollment,
  onVerified,
}: {
  enrollment: Enrollment;
  onVerified: () => void;
}) {
  const router = useRouter();
  const secret = new URL(enrollment.totpURI).searchParams.get("secret") ?? "";
  const form = useForm({
    resolver: arktypeResolver(verifyTotpSchema),
    defaultValues: { code: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ code }) => {
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    if (error) {
      form.setError("root", { message: "El código no es válido. Revísalo e intenta de nuevo." });
      return;
    }
    onVerified();
    // The session now has 2FA: reload the guards' view of it.
    await router.invalidate();
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Escanea el código</CardTitle>
        <CardDescription>
          Escanéalo con tu aplicación de autenticación y escribe el código de 6 dígitos que te
          muestra.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="flex flex-col gap-6">
          {/* Rendered here: the URI holds the shared secret and must not go to a QR service. */}
          <div className="w-fit rounded-lg border bg-white p-4">
            <QRCode value={enrollment.totpURI} size={176} title="Código QR de la verificación" />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">¿No puedes escanearlo? Usa esta clave:</p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-sm break-all">{secret}</code>
              <CopyButton value={secret} label="Copiar clave" iconOnly />
            </div>
          </div>
          <FieldGroup>
            <Controller
              name="code"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="verify-2fa-code">Código de verificación</FieldLabel>
                  <Input
                    {...field}
                    id="verify-2fa-code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    className="max-w-48 font-mono tracking-widest"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            {errors.root && (
              <Alert variant="destructive">
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            Verificar y activar
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function BackupCodes({ codes }: { codes: string[] }) {
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Guarda tus códigos de respaldo</CardTitle>
        <CardDescription>
          Cada código sirve una sola vez para entrar si pierdes acceso a tu aplicación de
          autenticación. No los volverás a ver.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
          {codes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <CopyButton value={codes.join("\n")} label="Copiar códigos" />
      </CardContent>
    </Card>
  );
}

function DisableTwoFactor() {
  const router = useRouter();
  const form = useForm({
    resolver: arktypeResolver(enableTwoFactorSchema),
    defaultValues: { password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    const { error } = await authClient.twoFactor.disable({ password });
    if (error) {
      form.setError("root", {
        message:
          error.code === "INVALID_PASSWORD"
            ? "La contraseña no coincide."
            : "No pudimos desactivar la verificación. Intenta de nuevo.",
      });
      return;
    }
    await router.invalidate();
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Desactivar la verificación en dos pasos</CardTitle>
        <CardDescription>
          Tu cuenta quedará protegida solo por la contraseña. Si eres parte del equipo de Cetus,
          perderás el acceso a la administración.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent>
          <FieldGroup>
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="disable-2fa-password">Contraseña</FieldLabel>
                  <PasswordInput
                    {...field}
                    id="disable-2fa-password"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            {errors.root && (
              <Alert variant="destructive">
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" variant="destructive" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            Desactivar
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
