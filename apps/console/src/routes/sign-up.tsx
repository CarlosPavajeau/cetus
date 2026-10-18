import { arktypeResolver } from "@hookform/resolvers/arktype";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { bootstrapAccount } from "~/features/account/server";
import { signUpSchema } from "~/features/auth/schema";
import { authClient } from "~/lib/auth/client";

export const Route = createFileRoute("/sign-up")({
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
  const navigate = useNavigate();
  const form = useForm({
    resolver: arktypeResolver(signUpSchema),
    defaultValues: { name: "", company: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ name, company, email, password }) => {
    const { error: signUpError } = await authClient.signUp.email({ name, email, password });
    if (signUpError) {
      form.setError("root", { message: signUpError.message ?? "No pudimos crear la cuenta. Revisa los datos." });
      return;
    }

    // 1. Organization in Better Auth  2. Make it active  3. Matching account in the Java API
    const { data: organization, error: orgError } = await authClient.organization.create({
      name: company,
      slug: slugify(company),
    });
    if (orgError || !organization) {
      form.setError("root", { message: "Tu usuario quedó creado, pero no la empresa. Inicia sesión para terminar." });
      return;
    }
    await authClient.organization.setActive({ organizationId: organization.id });
    await bootstrapAccount({ data: { name: company } });
    await navigate({ to: "/overview" });
  });

  return (
    <AuthLayout title="Crea tu cuenta" lead="Empieza en el ambiente de pruebas; pasar a producción es un cambio de llave.">
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="sign-up-name">Tu nombre</FieldLabel>
                <Input {...field} id="sign-up-name" autoComplete="name" aria-invalid={fieldState.invalid} />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="company"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="sign-up-company">Empresa</FieldLabel>
                <Input {...field} id="sign-up-company" autoComplete="organization" aria-invalid={fieldState.invalid} />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="sign-up-email">Correo de trabajo</FieldLabel>
                <Input
                  {...field}
                  id="sign-up-email"
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
                <FieldLabel htmlFor="sign-up-password">Contraseña</FieldLabel>
                <Input
                  {...field}
                  id="sign-up-password"
                  type="password"
                  autoComplete="new-password"
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
          {errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}
          <Field>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
            </Button>
            <FieldDescription className="text-center">
              ¿Ya tienes cuenta? <Link to="/sign-in">Inicia sesión</Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
