import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { HopIcon } from 'lucide-react'
import { OnBoardingForm } from '@/components/forms/onboarding'
import { getSession } from '@/functions/get-session'

export const Route = createFileRoute('/onboarding/')({
  beforeLoad: async () => {
    const session = await getSession()

    if (!session) {
      throw redirect({
        to: '/sign-in',
      })
    }

    if (session.session.activeOrganizationId) {
      throw redirect({
        to: '/app',
      })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <div className="m-auto h-fit w-full max-w-sm overflow-hidden rounded-[calc(var(--radius)+.125rem)] border bg-muted dark:[--color-muted:var(--color-zinc-900)]">
        <div className="-m-px rounded-[calc(var(--radius)+.125rem)] border bg-card p-8 pb-6">
          <div className="text-center">
            <Link aria-label="go home" className="mx-auto block w-fit" to="/">
              <HopIcon />
            </Link>
            <h1 className="mt-4 mb-1 font-semibold text-xl">
              Antes de continuar
            </h1>
            <p className="text-sm">
              Registra los datos de tu tienda para continuar
            </p>
          </div>

          <div className="mt-6 space-y-6">
            <OnBoardingForm />
          </div>
        </div>
      </div>
    </section>
  )
}
