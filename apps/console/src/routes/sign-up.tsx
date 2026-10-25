import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { PasswordInput } from "~/features/auth/PasswordInput";
import { signUpSchema } from "~/features/auth/schema";
import { invitationSearch } from "~/features/auth/session-start";
import { createWorkspace } from "~/features/auth/workspace";
import { legalAcceptance, legalAcceptanceHeader } from "~/features/legal/documents";
import { LegalLink } from "~/features/legal/LegalLink";
import { authClient } from "~/lib/auth/client";

/** `invitation`: the invitation the person came to accept; they join that organization instead of a new one. */
export const Route = createFileRoute("/sign-up")({
  validateSearch: invitationSearch,
  component: SignUp,
});

function SignUp() {
  const { invitation } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: arktypeResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", acceptedLegal: false },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ name, email, password }) => {
    const { error: signUpError } = await authClient.signUp.email(
      { name, email, password },
      { headers: { [legalAcceptanceHeader]: legalAcceptance } },
    );
    if (signUpError) {
      form.setError("root", {
        message: signUpError.message ?? "No pudimos crear la cuenta. Revisa los datos.",
      });
      return;
    }

    if (invitation) {
      // Joining takes a confirmed address, so the person gets no organization of their own: the email's
      // link brings them back to the invitation, and the console offers the rest once they have one.
      const { error: sendError } = await authClient.sendVerificationEmail({
        email,
        callbackURL: `/invitations/${invitation}`,
      });
      queryClient.clear();
      await navigate({
        to: "/invitations/$invitationId",
        params: { invitationId: invitation },
        search: sendError ? {} : { sent: true },
      });
      return;
    }

    // Sign-up does not ask for the company, so the workspace starts with the person's name.
    if (!(await createWorkspace(name))) {
      form.setError("root", {
        message: "Tu usuario quedó creado, pero no la empresa. Inicia sesión para terminar.",
      });
      return;
    }
    // Not checked: the console's banner offers to send it again.
    await authClient.sendVerificationEmail({ email, callbackURL: "/overview" });
    // Drop anything cached by a previous session in this tab (e.g. one that expired).
    queryClient.clear();
    await navigate({ to: "/overview" });
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
          <Controller
            name="acceptedLegal"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                <Checkbox
                  id="sign-up-legal"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="sign-up-legal-error"
                />
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="sign-up-legal" className="block font-normal">
                    Acepto los <LegalLink document="terms">términos de servicio</LegalLink> y
                    autorizo el tratamiento de mis datos según la{" "}
                    <LegalLink document="privacy">política de datos</LegalLink>.
                  </FieldLabel>
                  <FieldError id="sign-up-legal-error" errors={[fieldState.error]} />
                </div>
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
