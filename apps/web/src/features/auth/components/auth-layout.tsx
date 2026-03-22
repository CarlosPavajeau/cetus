import { Alert, AlertDescription, AlertTitle } from '@cetus/ui/alert'
import { Button } from '@cetus/ui/button'
import { Form } from '@cetus/ui/form'
import { GoogleSignIn } from '@cetus/web/components/google-sign-in'
import { Link } from '@tanstack/react-router'
import { BarChart2, HopIcon, ShieldCheck, ShoppingBag } from 'lucide-react'
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

const FEATURES = [
  { Icon: ShoppingBag, label: 'Gestión de productos e inventario' },
  { Icon: BarChart2, label: 'Reportes y métricas en tiempo real' },
  { Icon: ShieldCheck, label: 'Pagos seguros con Wompi y Mercado Pago' },
] as const

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
    <div className="flex min-h-dvh">
      {/* ── Left panel — brand & marketing (lg+) ── */}
      <aside
        aria-hidden="true"
        className="relative hidden overflow-hidden bg-primary lg:flex lg:w-[52%] lg:flex-col"
      >
        {/* Decorative rings */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full border-[2px] border-primary-foreground/15" />
          <div className="absolute -right-16 -bottom-16 h-80 w-80 rounded-full border-[2px] border-primary-foreground/10" />
          <div className="absolute bottom-1/3 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full border border-primary-foreground/10" />
          <div className="absolute top-1/2 left-12 h-40 w-40 -translate-y-1/2 rounded-full bg-primary-foreground/5" />
        </div>

        {/* Inner content */}
        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
          {/* Brand mark */}
          <Link
            aria-label="Ir al inicio"
            className="flex w-fit items-center gap-2.5 text-primary-foreground transition-opacity hover:opacity-75"
            to="/"
          >
            <HopIcon className="h-7 w-7" />
            <span className="font-semibold text-xl tracking-tight">Cetus</span>
          </Link>

          {/* Headline + features */}
          <div>
            <h2 className="font-bold text-3xl text-primary-foreground leading-tight xl:text-[2.5rem]">
              Gestiona tu tienda
              <br />
              <span className="text-primary-foreground/80">
                con total confianza
              </span>
            </h2>
            <p className="mt-4 max-w-xs text-primary-foreground/90 text-sm leading-relaxed">
              Plataforma completa para administrar productos, pedidos y clientes
              desde un solo lugar.
            </p>

            <ul className="mt-8 space-y-3.5">
              {FEATURES.map(({ Icon, label }) => (
                <li className="flex items-center gap-3" key={label}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                    <Icon className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="text-primary-foreground/95 text-sm">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-primary-foreground/60 text-xs">
            © 2025 Cetus · Todos los derechos reservados.
          </p>
        </div>
      </aside>

      {/* ── Right panel — form ── */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Logo — visible only on mobile (left panel is hidden) */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Link
              aria-label="Ir al inicio"
              className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-70"
              to="/"
            >
              <HopIcon className="h-7 w-7 text-primary" />
              <span className="font-semibold text-lg tracking-tight">
                Cetus
              </span>
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="font-bold text-2xl text-foreground tracking-tight">
              {title}
            </h1>
            <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          </div>

          {/* Auth error */}
          {authError && (
            <div className="mb-5" role="alert">
              <Alert variant="destructive">
                <AlertTitle>Ha ocurrido un error</AlertTitle>
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Form fields + submit */}
          <Form {...form}>
            <form className="space-y-5" onSubmit={onSubmit}>
              {children}
            </form>
          </Form>

          {/* Divider */}
          <div className="relative my-6 flex items-center">
            <hr className="flex-1 border-dashed" />
            <span className="mx-3 shrink-0 text-muted-foreground text-xs">
              O continúa con
            </span>
            <hr className="flex-1 border-dashed" />
          </div>

          {/* Social auth */}
          <GoogleSignIn className="w-full" invitation={invitation} />

          {/* Footer link */}
          <p className="mt-6 text-center text-muted-foreground text-sm">
            {footerText}
            <Button asChild className="px-1.5" variant="link">
              <Link search={{ invitation }} to={footerLinkTo}>
                {footerLinkText}
              </Link>
            </Button>
          </p>
        </div>
      </main>
    </div>
  )
}
