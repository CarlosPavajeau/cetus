import { authClient } from '@/auth/auth-client'
import { GoogleSignIn } from '@/components/google-sign-in'
import { SubmitButton } from '@/components/submit-button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { createFileRoute, Link } from '@tanstack/react-router'
import { type } from 'arktype'
import { HopIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

const SignInSearchSchema = type({
  invitation: type.string.or(type.undefined).optional(),
})

const SignInWithEmailAndPasswordSchema = type({
  email: type('string.email'),
  password: type('string'),
})

export const Route = createFileRoute('/sign-in')({
  validateSearch: SignInSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  const { invitation } = Route.useSearch()
  const [authError, setAuthError] = useState<string | undefined>()

  const form = useForm({
    resolver: arktypeResolver(SignInWithEmailAndPasswordSchema),
  })

  const callbackUrl = useMemo(() => {
    if (invitation) {
      return `/accept-invitation/${invitation}`
    }
    return '/app'
  }, [invitation])

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
    <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <Form {...form}>
        <form
          className="m-auto h-fit w-full max-w-sm overflow-hidden rounded-[calc(var(--radius)+.125rem)] border bg-muted dark:[--color-muted:var(--color-zinc-900)]"
          onSubmit={handleSubmit}
        >
          <div className="-m-px rounded-[calc(var(--radius)+.125rem)] border bg-card p-8 pb-6">
            <div className="text-center">
              <Link aria-label="go home" className="mx-auto block w-fit" to="/">
                <HopIcon />
              </Link>
              <h1 className="mt-4 mb-1 font-semibold text-xl">
                Iniciar sesión en Cetus
              </h1>
              <p className="text-sm">
                ¡Bienvenido de nuevo! Inicia sesión para continuar
              </p>
            </div>

            {authError && (
              <div className="mt-6">
                <Alert variant="destructive">
                  <AlertTitle>Ha ocurrido un error</AlertTitle>
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              </div>
            )}

            <div className="mt-6 space-y-6">
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
                        <Link
                          className="link intent-info variant-ghost text-sm"
                          to="/"
                        >
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
            </div>

            <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <hr className="border-dashed" />
              <span className="text-muted-foreground text-xs">
                O continúa con
              </span>
              <hr className="border-dashed" />
            </div>

            <div className="grid gap-3">
              <GoogleSignIn invitation={invitation} />
            </div>
          </div>

          <div className="p-3">
            <p className="text-center text-accent-foreground text-sm">
              ¿No tienes una cuenta?
              <Button asChild className="px-2" variant="link">
                <Link
                  search={{
                    invitation,
                  }}
                  to="/sign-up"
                >
                  Crear cuenta
                </Link>
              </Button>
            </p>
          </div>
        </form>
      </Form>
    </section>
  )
}
