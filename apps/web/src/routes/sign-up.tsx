import { authClient } from '@cetus/auth/client'
import { signUpWithEmailAndPasswordSchema } from '@cetus/schemas/auth.schema'
import { Field, FieldError, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { Input } from '@cetus/ui/input'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { AuthLayout } from '@cetus/web/features/auth/components/auth-layout'
import { authSearchSchema } from '@cetus/web/schemas/auth'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

export const Route = createFileRoute('/sign-up')({
  validateSearch: authSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { invitation } = Route.useSearch()
  const [authError, setAuthError] = useState<string | undefined>()
  const callbackUrl =
    invitation !== undefined ? `/accept-invitation/${invitation}` : '/app'

  const form = useForm({
    resolver: arktypeResolver(signUpWithEmailAndPasswordSchema),
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    const { error } = await authClient.signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
      callbackURL: callbackUrl,
    })

    if (error) {
      setAuthError(error.message)
    }
  })

  return (
    <AuthLayout
      authError={authError}
      description="¡Bienvenido! Crea una cuenta para continuar"
      footerLinkText="Iniciar sesión"
      footerLinkTo="/sign-in"
      footerText="¿Ya tienes una cuenta?"
      form={form}
      invitation={invitation}
      onSubmit={handleSubmit}
      title="Crear una cuenta en Cetus"
    >
      <FieldGroup>
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="name">Nombre</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                autoComplete="off"
                id="name"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

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
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
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
        Crear cuenta
      </SubmitButton>
    </AuthLayout>
  )
}
