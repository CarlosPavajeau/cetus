import { arktypeResolver } from '@hookform/resolvers/arktype'
import { createFileRoute, Link } from '@tanstack/react-router'
import { type } from 'arktype'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { authClient } from '@/shared/auth-client'

const SignUpWithEmailAndPasswordSchema = type({
  name: type('string'),
  email: type('string.email'),
  password: type('string'),
})

export const Route = createFileRoute('/sign-up')({
  validateSearch: AuthSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { invitation } = Route.useSearch()
  const [authError, setAuthError] = useState<string | undefined>()
  const callbackUrl = useAuthCallback(invitation)

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
        Crear cuenta
      </SubmitButton>
    </AuthLayout>
  )
}
