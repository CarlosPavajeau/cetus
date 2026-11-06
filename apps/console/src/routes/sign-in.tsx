import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2Icon, TimerOffIcon } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { signInErrorMessage } from "~/features/auth/errors";
import { PasswordInput } from "~/features/auth/PasswordInput";
import { signInSchema } from "~/features/auth/schema";
import { invitationSearch, startSession } from "~/features/auth/session-start";
import { getInvitedOrganization } from "~/features/members/server";
import { authClient } from "~/lib/auth/client";

/**
 * `invitation`: the invitation the person came to accept; after signing in they go back to it.
 * `reset`: the person just chose a new password.
 * `expired`: the person reached /two-factor without a pending sign-in (it timed out, or was already used).
 */
export const Route = createFileRoute("/sign-in")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { invitation?: string; reset?: true; expired?: true } => ({
    ...invitationSearch(search),
    ...(search.reset === true || search.reset === "true" ? { reset: true as const } : {}),
    ...(search.expired === true || search.expired === "true" ? { expired: true as const } : {}),
  }),
  loaderDeps: ({ search }) => ({ invitation: search.invitation }),
  loader: ({ deps }) =>
    deps.invitation ? getInvitedOrganization({ data: { id: deps.invitation } }) : null,
  component: SignIn,
});

function SignIn() {
  const { invitation, reset, expired } = Route.useSearch();
  const organizationName = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: arktypeResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    form.setFocus("email");
  }, [form]);
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    const { data, error: signInError } = await authClient.signIn.email(values);
    if (signInError) {
      form.setError("root", { message: signInErrorMessage(signInError) });
      return;
    }
    // The password was right but the account has 2FA: the session starts after the code.
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      await navigate({ to: "/two-factor", search: { invitation } });
      return;
    }

    startSession(queryClient);
    await (invitation
      ? navigate({ to: "/invitations/$invitationId", params: { invitationId: invitation } })
      : navigate({ to: "/overview" }));
  });

  return (
    <AuthLayout
      title="Iniciar sesión"
      {...(invitation
        ? {
            lead: organizationName
              ? `${organizationName} te espera. Inicia sesión para unirte.`
              : "Inicia sesión para ver tu invitación.",
          }
        : {
            noteSandbox: true,
            lead: "Vuelve a tu espacio de trabajo para gestionar tus emisores, llaves y documentos.",
          })}
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          {reset && (
            <Alert>
              <CheckCircle2Icon />
              <AlertTitle>Contraseña cambiada</AlertTitle>
              <AlertDescription>Inicia sesión con la nueva.</AlertDescription>
            </Alert>
          )}
          {expired && !reset && (
            <Alert>
              <TimerOffIcon />
              <AlertTitle>La verificación venció</AlertTitle>
              <AlertDescription>
                El paso del código dura unos minutos. Inicia sesión de nuevo para continuar.
              </AlertDescription>
            </Alert>
          )}
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
                  size="lg"
                  aria-invalid={fieldState.invalid}
                />
                {invitation && !fieldState.invalid ? (
                  <FieldDescription>Usa el correo al que llegó la invitación.</FieldDescription>
                ) : (
                  <FieldError errors={[fieldState.error]} />
                )}
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
              search={{ invitation }}
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
