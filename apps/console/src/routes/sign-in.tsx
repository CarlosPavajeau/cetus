import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { PasswordInput } from "~/features/auth/PasswordInput";
import { signInSchema } from "~/features/auth/schema";
import { startSession } from "~/features/auth/session-start";
import { authClient } from "~/lib/auth/client";

export const Route = createFileRoute("/sign-in")({
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: arktypeResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    const { data, error: signInError } = await authClient.signIn.email(values);
    if (signInError) {
      form.setError("root", {
        message:
          signInError.code === "BANNED_USER"
            ? (signInError.message ?? "Tu acceso a Cetus está bloqueado.")
            : "El correo o la contraseña no coinciden. Revísalos e intenta de nuevo.",
      });
      return;
    }
    // The password was right but the account has 2FA: the session starts after the code.
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      await navigate({ to: "/two-factor" });
      return;
    }

    await startSession(queryClient);
    await navigate({ to: "/overview" });
  });

  return (
    <AuthLayout
      title="Iniciar sesión"
      lead="Vuelve a tu espacio de trabajo para gestionar tus emisores, llaves y documentos."
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="sign-in-email">Correo electrónico</FieldLabel>
                <Input
                  {...field}
                  id="sign-in-email"
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
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="sign-in-password">Contraseña</FieldLabel>
                <PasswordInput
                  {...field}
                  id="sign-in-password"
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Link
            to="/forgot-password"
            className="self-end text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
          {errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" size="lg" className="h-11" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {isSubmitting ? "Entrando…" : "Iniciar sesión"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Aún no tienes cuenta?{" "}
            <Link
              to="/sign-up"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Crea una
            </Link>
          </p>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
