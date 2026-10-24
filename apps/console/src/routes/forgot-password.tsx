import { arktypeResolver } from "@hookform/resolvers/arktype";
import { Link, createFileRoute } from "@tanstack/react-router";
import { MailCheckIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { forgotPasswordSchema } from "~/features/auth/schema";
import { authClient } from "~/lib/auth/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const [sentTo, setSentTo] = useState<string>();
  const form = useForm({
    resolver: arktypeResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email }) => {
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    if (error) {
      form.setError("root", {
        message:
          error.status === 429
            ? "Ya pediste varios enlaces. Espera unos minutos antes de pedir otro."
            : "No pudimos enviar el enlace. Inténtalo de nuevo en un momento.",
      });
      return;
    }
    // The same answer whether or not the address has an account: the page reveals none.
    setSentTo(email);
  });

  return (
    <AuthLayout
      title="Recuperar contraseña"
      lead="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva."
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          {sentTo && (
            <Alert>
              <MailCheckIcon />
              <AlertTitle>Revisa tu correo</AlertTitle>
              <AlertDescription>
                Si hay una cuenta con {sentTo}, te enviamos un enlace para elegir una contraseña
                nueva. Vence en 1 hora.
              </AlertDescription>
            </Alert>
          )}
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="forgot-password-email">Correo electrónico</FieldLabel>
                <Input
                  {...field}
                  id="forgot-password-email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@empresa.com"
                  className="h-11 px-3"
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
            {isSubmitting ? "Enviando…" : sentTo ? "Enviar otro enlace" : "Enviar enlace"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿La recordaste?{" "}
            <Link
              to="/sign-in"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
