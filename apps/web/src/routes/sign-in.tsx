import { authClient } from '@cetus/auth/client'
import { signInWithEmailAndPasswordSchema } from '@cetus/schemas/auth.schema'
import { Button } from '@cetus/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { Input } from '@cetus/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@cetus/ui/input-group'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { AuthLayout } from '@cetus/web/features/auth/components/auth-layout'
import { authSearchSchema } from '@cetus/web/schemas/auth'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { createFileRoute, Link } from '@tanstack/react-router'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

export const Route = createFileRoute('/sign-in')({
  validateSearch: authSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { invitation } = Route.useSearch()
  const [authError, setAuthError] = useState<string | undefined>()
  const [showPassword, setShowPassword] = useState(false)
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
                autoComplete="email"
                id="email"
                type="email"
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

              <InputGroup>
                <InputGroupInput
                  {...field}
                  type={showPassword ? 'text' : 'password'}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    onClick={() => setShowPassword((v) => !v)}
                    size="icon-xs"
                    title={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>

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
