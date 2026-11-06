import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  TimerOffIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button, buttonVariants } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { BackupCodeInput, TotpCodeInput } from "~/features/auth/CodeInput";
import { tooManyAttemptsMessage } from "~/features/auth/errors";
import { backupCodeSchema, totpCodeSchema } from "~/features/auth/schema";
import { hasPendingTwoFactor } from "~/features/auth/server";
import { invitationSearch, startSession } from "~/features/auth/session-start";
import { authClient } from "~/lib/auth/client";
import { cn } from "~/lib/utils";

/**
 * Second step of the sign-in for accounts with 2FA. Better Auth keeps the pending sign-in in a
 * short-lived cookie; without it the verification fails and the person starts over. `invitation` comes
 * from the sign-in, so someone who came to accept an invitation lands back on it.
 */
export const Route = createFileRoute("/two-factor")({
  validateSearch: invitationSearch,
  beforeLoad: async ({ search }) => {
    if (!(await hasPendingTwoFactor())) {
      throw redirect({ to: "/sign-in", search: { invitation: search.invitation } });
    }
  },
  component: TwoFactor,
});

function TwoFactor() {
  const { invitation } = Route.useSearch();
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [expired, setExpired] = useState(false);

  if (expired) {
    return (
      <AuthLayout
        icon={<TimerOffIcon strokeWidth={1.75} />}
        eyebrow="SEGURIDAD DE LA CUENTA"
        title="La verificación venció"
        lead="El paso del código dura unos minutos. Inicia sesión de nuevo para continuar."
      >
        <Link
          to="/sign-in"
          search={{ invitation }}
          className={cn(buttonVariants({ size: "lg", className: "h-11" }))}
        >
          Iniciar sesión de nuevo
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={<ShieldCheckIcon strokeWidth={1.75} />}
      eyebrow="SEGURIDAD DE LA CUENTA"
      title="Verificación en dos pasos"
      lead={
        useBackupCode
          ? "Escribe uno de los códigos de respaldo que guardaste al activar la verificación."
          : "Abre tu aplicación de autenticación y escribe el código de 6\u00A0dígitos que muestra para tu cuenta de Cetus."
      }
    >
      {/* Remount on switch so each form keeps its own resolver and values. */}
      <CodeForm
        key={String(useBackupCode)}
        backup={useBackupCode}
        onExpired={() => setExpired(true)}
      />
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {useBackupCode
              ? "¿Ya tienes tu aplicación a mano?"
              : "¿No tienes acceso a tu aplicación?"}
          </p>
          <Button
            variant="link"
            // oxlint-disable-next-line shadcn/no-restyle -- a text link under the prompt, without a button's box
            className="h-auto p-0"
            onClick={() => setUseBackupCode((current) => !current)}
          >
            {useBackupCode ? (
              <SmartphoneIcon data-icon="inline-start" />
            ) : (
              <KeyRoundIcon data-icon="inline-start" />
            )}
            <span className="underline underline-offset-4">
              {useBackupCode ? "Usar la aplicación de autenticación" : "Usar un código de respaldo"}
            </span>
          </Button>
        </div>
        <Link
          to="/sign-in"
          search={{ invitation }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          Volver a iniciar sesión
        </Link>
      </div>
    </AuthLayout>
  );
}

function CodeForm({ backup, onExpired }: { backup: boolean; onExpired: () => void }) {
  const { invitation } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: arktypeResolver(backup ? backupCodeSchema : totpCodeSchema),
    defaultValues: { code: "", trustDevice: false },
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    form.setFocus("code");
  }, [form]);

  const onSubmit = form.handleSubmit(async ({ code, trustDevice }) => {
    const { error } = backup
      ? await authClient.twoFactor.verifyBackupCode({ code, trustDevice })
      : await authClient.twoFactor.verifyTotp({ code, trustDevice });
    if (error?.code === "INVALID_TWO_FACTOR_COOKIE") {
      onExpired();
      return;
    }
    if (error) {
      form.setValue("code", "");
      form.setFocus("code");
      form.setError("root", {
        message:
          error.status === 429
            ? tooManyAttemptsMessage
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
      <FieldGroup className="gap-6">
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
                <TotpCodeInput
                  {...field}
                  id="two-factor-code"
                  boxed
                  aria-invalid={fieldState.invalid}
                  onComplete={() => {
                    if (!form.formState.isSubmitting) {
                      void onSubmit();
                    }
                  }}
                />
              )}
              {fieldState.error ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription>
                  {backup
                    ? "10 letras y números, en dos grupos de cinco. El guion se pone solo."
                    : "El código cambia periódicamente. Usa el más reciente."}
                </FieldDescription>
              )}
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
              <FieldContent>
                <FieldLabel htmlFor="two-factor-trust">
                  Confiar en este dispositivo durante 30{"\u00A0"}días
                </FieldLabel>
                <FieldDescription>
                  Solo si es un dispositivo personal. No lo actives en equipos públicos o
                  compartidos.
                </FieldDescription>
              </FieldContent>
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
          {isSubmitting ? "Verificando…" : "Verificar y continuar"}
        </Button>
      </FieldGroup>
    </form>
  );
}
