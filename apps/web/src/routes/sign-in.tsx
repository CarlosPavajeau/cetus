import { authClient } from '@cetus/auth/client'
import { signInWithEmailAndPasswordSchema } from '@cetus/schemas/auth.schema'
import { Button } from '@cetus/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { Input } from '@cetus/ui/input'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { AuthLayout } from '@cetus/web/features/auth/components/auth-layout'
import { authSearchSchema } from '@cetus/web/schemas/auth'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

export const Route = createFileRoute('/sign-in')({
  validateSearch: authSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { invitation } = Route.useSearch()
  const [authError, setAuthError] = useState<string | undefined>()
  const callbackUrl =
    invitation !== undefined ? `/accept-invitation/${invitation}` : '/app'

  const form = useForm({
    resolver: arktypeResolver(signInWithEmailAndPasswordSchema),
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    const { error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
      rememberMe: true,
      callbackURL: callbackUrl,
    })

    if (error) {
      setAuthError(error.message)
    }
  })

  return (
    <AuthLayout
      authError={authError}
      description="¡Bienvenido de nuevo! Inicia sesión para continuar"
      footerLinkText="Crear cuenta"
      footerLinkTo="/sign-up"
      footerText="¿No tienes una cuenta?"
      form={form}
      invitation={invitation}
      onSubmit={handleSubmit}
      title="Iniciar sesión en Cetus"
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="off"
                id="email"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>

                <Button asChild size="xs" variant="link">
                  <Link to="/">¿Olvidaste tu contraseña?</Link>
                </Button>
              </div>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="off"
                id="password"
                type="password"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <SubmitButton
        className="w-full"
        disabled={form.formState.isSubmitting}
        isSubmitting={form.formState.isSubmitting}
        size="lg"
        type="submit"
      >
        Iniciar sesión
      </SubmitButton>
    </AuthLayout>
  )
}
