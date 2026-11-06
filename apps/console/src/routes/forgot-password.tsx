import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { MailCheckIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button, buttonVariants } from "~/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { forgotPasswordSchema } from "~/features/auth/schema";
import { authClient } from "~/lib/auth/client";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

/** The same answer whether or not the address has an account: the page reveals none. */
async function requestResetLink(email: string) {
  const { error } = await authClient.requestPasswordReset({
    email,
    redirectTo: "/reset-password",
  });
  if (!error) {
    return null;
  }
  return error.status === 429
    ? "Ya pediste varios enlaces. Espera unos minutos antes de pedir otro."
    : "No pudimos enviar el enlace. Inténtalo de nuevo en un momento.";
}

function ForgotPassword() {
  const [sentTo, setSentTo] = useState<string>();
  const form = useForm({
    resolver: arktypeResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (!sentTo) {
      form.setFocus("email");
    }
  }, [form, sentTo]);
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ email }) => {
    const message = await requestResetLink(email);
    if (message) {
      form.setError("root", { message });
      return;
    }
    setSentTo(email);
  });

  if (sentTo) {
    return <LinkSent email={sentTo} onChangeEmail={() => setSentTo(undefined)} />;
  }

  return (
    <AuthLayout
      title="Recuperar contraseña"
      lead="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva."
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
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
                  size="lg"
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
          <Button type="submit" size="xl" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {isSubmitting ? "Enviando…" : "Enviar enlace"}
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

function LinkSent({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const resend = useMutation({
    mutationFn: async () => {
      const message = await requestResetLink(email);
      if (message) {
        throw new Error(message);
      }
    },
  });

  return (
    <AuthLayout
      icon={<MailCheckIcon />}
      title="Revisa tu correo"
      lead={`Si hay una cuenta con ${email}, te enviamos un enlace para elegir una contraseña nueva. Vence en 1 hora.`}
    >
      <div className="flex flex-col gap-5">
        {resend.error && (
          <Alert variant="destructive">
            <AlertDescription>{resend.error.message}</AlertDescription>
          </Alert>
        )}
        <Link to="/sign-in" className={cn(buttonVariants({ variant: "outline", size: "xl" }))}>
          Volver a iniciar sesión
        </Link>
        <div className="flex flex-col gap-1 text-center text-sm text-muted-foreground">
          <p>¿No llegó? Revisa la carpeta de spam.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-2">
            <Button variant="link" disabled={resend.isPending} onClick={() => resend.mutate()}>
              {resend.isPending && <Spinner data-icon="inline-start" />}
              Enviar otro enlace
            </Button>
            <Button variant="link" onClick={onChangeEmail}>
              Usar otro correo
            </Button>
          </div>
          <output className="text-xs">
            {resend.isSuccess && !resend.isPending ? "Te enviamos otro enlace." : ""}
          </output>
        </div>
      </div>
    </AuthLayout>
  );
}
