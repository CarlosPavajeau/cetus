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
import { bootstrapAccount } from "~/features/account/server";
import { PasswordInput } from "~/features/auth/PasswordInput";
import { signUpSchema } from "~/features/auth/schema";
import { authClient } from "~/lib/auth/client";

/** `invitation`: the invitation the person came to accept; they join that organization instead of a new one. */
export const Route = createFileRoute("/sign-up")({
  validateSearch: (search): { invitation?: string } =>
    typeof search.invitation === "string" && search.invitation
      ? { invitation: search.invitation }
      : {},
  component: SignUp,
});

function slugify(value: string) {
  const base = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${base || "empresa"}-${Math.random().toString(36).slice(2, 6)}`;
}

function SignUp() {
  const { invitation } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: arktypeResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ name, email, password }) => {
    const { error: signUpError } = await authClient.signUp.email({ name, email, password });
    if (signUpError) {
      form.setError("root", {
        message: signUpError.message ?? "No pudimos crear la cuenta. Revisa los datos.",
      });
      return;
    }

    if (invitation) {
      // Accepting makes the inviting organization active, and its account already exists.
      const { error: acceptError } = await authClient.organization.acceptInvitation({
        invitationId: invitation,
      });
      if (!acceptError) {
        queryClient.clear();
        await navigate({ to: "/overview" });
        return;
      }
      // Another address, or an invitation no longer valid: the person still gets their own workspace,
      // and the invitation page tells them why they did not join.
    }

    // 1. Organization in Better Auth  2. Make it active  3. Matching account in the Java API.
    // Sign-up does not ask for the company, so the workspace starts with the person's name.
    const { data: organization, error: orgError } = await authClient.organization.create({
      name,
      slug: slugify(name),
    });
    if (orgError || !organization) {
      form.setError("root", {
        message: "Tu usuario quedó creado, pero no la empresa. Inicia sesión para terminar.",
      });
      return;
    }
    await authClient.organization.setActive({ organizationId: organization.id });
    await bootstrapAccount({ data: { name } });
    // Drop anything cached by a previous session in this tab (e.g. one that expired).
    queryClient.clear();
    await (invitation
      ? navigate({ to: "/invitations/$invitationId", params: { invitationId: invitation } })
      : navigate({ to: "/overview" }));
  });

  return (
    <AuthLayout
      title="Crear cuenta"
      eyebrow="EMPIEZA A INTEGRAR"
      lead="Empieza en ambiente de pruebas; pasar a producción es un cambio de llave."
      headline={["De pruebas a producción.", "Un cambio de llave."]}
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup className="gap-4.5">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="sign-up-name">Nombre completo</FieldLabel>
                <Input
                  {...field}
                  id="sign-up-name"
                  autoComplete="name"
                  placeholder="Tu nombre y apellido"
                  className="h-11 px-3"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="sign-up-email">Correo electrónico</FieldLabel>
                <Input
                  {...field}
                  id="sign-up-email"
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
                <FieldLabel htmlFor="sign-up-password">Contraseña</FieldLabel>
                <PasswordInput
                  {...field}
                  id="sign-up-password"
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
                <FieldLabel htmlFor="sign-up-confirm-password">Confirmar contraseña</FieldLabel>
                <PasswordInput
                  {...field}
                  id="sign-up-confirm-password"
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
            {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              to="/sign-in"
              search={{ invitation }}
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
