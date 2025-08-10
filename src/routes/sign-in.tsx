import { authClient } from '@/auth/auth-client'
import { AuthLayout } from '@/components/auth/auth-layout'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { AuthSearchSchema, useAuthCallback } from '@/hooks/use-auth-callback'
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
  validateSearch: AuthSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { invitation } = Route.useSearch()
  const [authError, setAuthError] = useState<string | undefined>()
  const callbackUrl = useAuthCallback(invitation)

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
              <Button asChild size="sm" variant="link">
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
        Iniciar sesión
      </SubmitButton>
    </AuthLayout>
  )
}
