import { Alert, AlertDescription, AlertTitle } from '@cetus/ui/alert'
import { Button } from '@cetus/ui/button'
import { Form } from '@cetus/ui/form'
import { GoogleSignIn } from '@cetus/web/components/google-sign-in'
import { Link } from '@tanstack/react-router'
import { HopIcon } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'

type AuthLayoutProps<T extends FieldValues = FieldValues> = {
  form: UseFormReturn<T>
  onSubmit: (e: FormEvent) => void
  title: string
  description: string
  authError?: string
  children: ReactNode
  invitation?: string
  footerText: string
  footerLinkText: string
  footerLinkTo: string
}

export function AuthLayout<T extends FieldValues = FieldValues>({
  form,
  onSubmit,
  title,
  description,
  authError,
  children,
  invitation,
  footerText,
  footerLinkText,
  footerLinkTo,
}: Readonly<AuthLayoutProps<T>>) {
  return (
    <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <Form {...form}>
        <form
          className="m-auto h-fit w-full max-w-sm overflow-hidden rounded-[calc(var(--radius)+.125rem)] border bg-muted dark:[--color-muted:var(--color-zinc-900)]"
          onSubmit={onSubmit}
        >
          <div className="-m-px rounded-[calc(var(--radius)+.125rem)] border bg-card p-8 pb-6">
            <div className="text-center">
              <Link aria-label="go home" className="mx-auto block w-fit" to="/">
                <HopIcon />
              </Link>
              <h1 className="mt-4 mb-1 font-semibold text-xl">{title}</h1>
              <p className="text-sm">{description}</p>
            </div>

            {authError && (
              <div className="mt-6">
                <Alert variant="destructive">
                  <AlertTitle>Ha ocurrido un error</AlertTitle>
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              </div>
            )}

            <div className="mt-6 space-y-6">{children}</div>

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
              {footerText}
              <Button asChild variant="link">
                <Link
                  search={{
                    invitation,
                  }}
                  to={footerLinkTo}
                >
                  {footerLinkText}
                </Link>
              </Button>
            </p>
          </div>
        </form>
      </Form>
    </section>
  )
}
