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

const SignInWithEmailAndPasswordSchema = type({
  email: type('string.email'),
  password: type('string'),
})

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
    resolver: arktypeResolver(SignInWithEmailAndPasswordSchema),
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
              <Button asChild size="xs" variant="link">
                <Link to="/">¿Olvidaste tu contraseña?</Link>
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
        Iniciar sesión
      </SubmitButton>
    </AuthLayout>
  )
}
