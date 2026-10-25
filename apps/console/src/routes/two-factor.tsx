import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { BackupCodeInput, TotpCodeInput } from "~/features/auth/CodeInput";
import { backupCodeSchema, totpCodeSchema } from "~/features/auth/schema";
import { invitationSearch, startSession } from "~/features/auth/session-start";
import { authClient } from "~/lib/auth/client";

/**
 * Second step of the sign-in for accounts with 2FA. Better Auth keeps the pending sign-in in a
 * short-lived cookie; without it the verification fails and the person starts over. `invitation` comes
 * from the sign-in, so someone who came to accept an invitation lands back on it.
 */
export const Route = createFileRoute("/two-factor")({
  validateSearch: invitationSearch,
  component: TwoFactor,
});

function TwoFactor() {
  const [useBackupCode, setUseBackupCode] = useState(false);

  return (
    <AuthLayout
      title="Verificación en dos pasos"
      lead={
        useBackupCode
          ? "Escribe uno de los códigos de respaldo que guardaste al activar la verificación."
          : "Escribe el código de 6 dígitos que muestra tu aplicación de autenticación."
      }
    >
      {/* Remount on switch so each form keeps its own resolver and values. */}
      <CodeForm key={String(useBackupCode)} backup={useBackupCode} />
      <Button
        variant="link"
        className="mt-4 w-full"
        onClick={() => setUseBackupCode((current) => !current)}
      >
        {useBackupCode ? "Usar la aplicación de autenticación" : "Usar un código de respaldo"}
      </Button>
    </AuthLayout>
  );
}

function CodeForm({ backup }: { backup: boolean }) {
  const { invitation } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: arktypeResolver(backup ? backupCodeSchema : totpCodeSchema),
    defaultValues: { code: "", trustDevice: false },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ code, trustDevice }) => {
    const { error } = backup
      ? await authClient.twoFactor.verifyBackupCode({ code, trustDevice })
      : await authClient.twoFactor.verifyTotp({ code, trustDevice });
    if (error) {
      form.setValue("code", "");
      form.setFocus("code");
      form.setError("root", {
        message:
          error.status === 429
            ? "Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo."
            : error.code === "INVALID_TWO_FACTOR_COOKIE"
              ? "La verificación expiró. Vuelve a iniciar sesión."
              : "El código no es válido. Revísalo e intenta de nuevo.",
      });
      return;
    }
    await startSession(queryClient);
    await (invitation
      ? navigate({ to: "/invitations/$invitationId", params: { invitationId: invitation } })
      : navigate({ to: "/overview" }));
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Controller
          name="code"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="two-factor-code">
                {backup ? "Código de respaldo" : "Código de verificación"}
              </FieldLabel>
              {backup ? (
                <BackupCodeInput
                  {...field}
                  id="two-factor-code"
                  aria-invalid={fieldState.invalid}
                />
              ) : (
                <TotpCodeInput {...field} id="two-factor-code" aria-invalid={fieldState.invalid} />
              )}
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="trustDevice"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <Checkbox
                id="two-factor-trust"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked)}
                onBlur={field.onBlur}
              />
              <FieldLabel htmlFor="two-factor-trust" className="font-normal">
                Confiar en este dispositivo durante 30 días
              </FieldLabel>
            </Field>
          )}
        />
        {errors.root && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" className="h-11" disabled={isSubmitting}>
          {isSubmitting && <Spinner data-icon="inline-start" />}
          {isSubmitting ? "Verificando…" : "Verificar"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            to="/sign-in"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Volver a iniciar sesión
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
