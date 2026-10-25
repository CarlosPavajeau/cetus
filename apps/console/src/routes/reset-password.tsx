import { arktypeResolver } from "@hookform/resolvers/arktype";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button, buttonVariants } from "~/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { PasswordInput } from "~/features/auth/PasswordInput";
import { resetPasswordSchema } from "~/features/auth/schema";
import { authClient } from "~/lib/auth/client";
import { cn } from "~/lib/utils";

/**
 * Where the emailed link lands: Better Auth checks the token at /api/auth/reset-password/{token} and sends the
 * person here with it, or with `error` when it expired or was already used.
 */
export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): { token?: string; error?: string } => ({
    ...(typeof search.token === "string" && search.token ? { token: search.token } : {}),
    ...(typeof search.error === "string" && search.error ? { error: search.error } : {}),
  }),
  // The token is in the URL: it must not leak to other sites through the Referer header.
  head: () => ({ meta: [{ name: "referrer", content: "no-referrer" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const { token, error } = Route.useSearch();
  const [expired, setExpired] = useState(false);

  if (!token || error || expired) {
    return (
      <AuthLayout
        title="Enlace no válido"
        lead="Este enlace para cambiar la contraseña ya no sirve."
      >
        <FieldGroup>
          <Alert>
            <AlertDescription>
              El enlace venció o ya se usó. Pide otro y úsalo dentro de la hora siguiente.
            </AlertDescription>
          </Alert>
          <Link
            to="/forgot-password"
            className={cn(buttonVariants({ size: "lg", className: "h-11" }))}
          >
            Pedir otro enlace
          </Link>
        </FieldGroup>
      </AuthLayout>
    );
  }

  return <NewPasswordForm token={token} onExpired={() => setExpired(true)} />;
}

function NewPasswordForm({ token, onExpired }: { token: string; onExpired: () => void }) {
  const navigate = useNavigate();
  const form = useForm({
    resolver: arktypeResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error?.code === "INVALID_TOKEN") {
      onExpired();
      return;
    }
    if (error) {
      form.setError("root", {
        message: "No pudimos cambiar la contraseña. Inténtalo de nuevo o pide otro enlace.",
      });
      return;
    }
    await navigate({ to: "/sign-in", search: { reset: true } });
  });

  return (
    <AuthLayout
      title="Elige una contraseña nueva"
      lead="Al cambiarla se cierran las sesiones abiertas de tu cuenta."
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup className="gap-4.5">
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="reset-password-password">Contraseña nueva</FieldLabel>
                <PasswordInput
                  {...field}
                  id="reset-password-password"
                  autoComplete="new-password"
                  placeholder="Crea una contraseña"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : (
                  <FieldDescription>Mínimo 10 caracteres.</FieldDescription>
                )}
              </Field>
            )}
          />
          <Controller
            name="confirmPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="reset-password-confirm-password">
                  Confirmar contraseña
                </FieldLabel>
                <PasswordInput
                  {...field}
                  id="reset-password-confirm-password"
                  autoComplete="new-password"
                  placeholder="Repite tu contraseña"
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
          <Button type="submit" size="lg" className="h-11" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {isSubmitting ? "Guardando…" : "Cambiar contraseña"}
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
