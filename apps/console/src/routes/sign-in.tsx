import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { signInSchema } from "~/features/auth/schema";
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
    const { error: signInError } = await authClient.signIn.email(values);
    if (signInError) {
      form.setError("root", {
        message: "El correo o la contraseña no coinciden. Revísalos e intenta de nuevo.",
      });
      return;
    }

    // Make sure there is an active organization: the API scopes everything by it.
    const { data: organizations } = await authClient.organization.list();
    const first = organizations?.[0];
    if (first) {
      await authClient.organization.setActive({ organizationId: first.id });
    }
    // Drop anything cached by a previous session in this tab (e.g. one that expired).
    queryClient.clear();
    await navigate({ to: "/overview" });
  });

  return (
    <AuthLayout
      title="Inicia sesión"
      lead="Entra para gestionar tus emisores, llaves y documentos."
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="sign-in-email">Correo</FieldLabel>
                <Input
                  {...field}
                  id="sign-in-email"
                  type="email"
                  autoComplete="email"
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
                <Input
                  {...field}
                  id="sign-in-password"
                  type="password"
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
          <Field>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {isSubmitting ? "Entrando…" : "Iniciar sesión"}
            </Button>
            <FieldDescription className="text-center">
              ¿Aún no tienes cuenta? <Link to="/sign-up">Crea una</Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
