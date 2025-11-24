import { authClient } from '@cetus/auth/client'
import { Button } from '@cetus/ui/button'
import { FormControl, FormField, FormItem, FormLabel } from '@cetus/ui/form'
import { Input } from '@cetus/ui/input'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { AuthLayout } from '@cetus/web/features/auth/components/auth-layout'
import { authSearchSchema } from '@cetus/web/schemas/auth'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { createFileRoute, Link } from '@tanstack/react-router'
import { type } from 'arktype'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

const SignUpWithEmailAndPasswordSchema = type({
  name: type('string'),
  email: type('string.email'),
  password: type('string'),
})

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
    resolver: arktypeResolver(SignUpWithEmailAndPasswordSchema),
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
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Contraseña</FormLabel>
              <Button asChild mode="link" size="sm" underline="solid">
                <Link className="link intent-info variant-ghost text-sm" to="/">
                  ¿Olvidaste tu contraseña?
                </Link>
              </Button>
            </div>
            <FormControl>
              <Input {...field} type="password" />
            </FormControl>
          </FormItem>
        )}
      />

      <SubmitButton
        className="w-full"
        disabled={!form.formState.isValid}
        isSubmitting={form.formState.isSubmitting}
        type="submit"
      >
        Crear cuenta
      </SubmitButton>
    </AuthLayout>
  )
}
