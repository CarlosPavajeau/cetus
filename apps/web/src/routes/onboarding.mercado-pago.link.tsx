import { api } from '@cetus/api-client'
import { Button } from '@cetus/ui/button'
import { getSession } from '@cetus/web/functions/get-session'
import { setActiveOrg } from '@cetus/web/functions/organizations'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { HopIcon } from 'lucide-react'

export const Route = createFileRoute('/onboarding/mercado-pago/link')({
  beforeLoad: async () => {
    const session = await getSession()

    if (!session) {
      throw redirect({
        to: '/sign-in',
      })
    }

    if (!session.session.activeOrganizationId) {
      const activeOrg = await setActiveOrg()

      if (!activeOrg) {
        throw redirect({
          to: '/app',
        })
      }
    }
  },
  loader: async () => {
    const authorizationUrl = await api.stores.getMercadoPagoAuthorizationUrl()

    return {
      authorizationUrl,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { authorizationUrl } = Route.useLoaderData()

  const goToMercadoPagoLink = () => {
    window.location.href = authorizationUrl
  }

  return (
    <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <div className="m-auto h-fit w-full max-w-sm overflow-hidden rounded-[calc(var(--radius)+.125rem)] border bg-muted dark:[--color-muted:var(--color-zinc-900)]">
        <div className="-m-px rounded-[calc(var(--radius)+.125rem)] border bg-card p-8 pb-6">
          <div className="text-center">
            <Link aria-label="go home" className="mx-auto block w-fit" to="/">
              <HopIcon />
            </Link>
            <h1 className="mt-4 mb-1 font-semibold text-xl">
              Un último paso antes de empezar
            </h1>
            <p className="text-sm">
              Vincula tu cuenta de Mercado Pago para aceptar pagos en tu tienda.
            </p>
          </div>

          <div className="mt-6 space-y-6">
            <Button className="w-full" onClick={goToMercadoPagoLink} size="lg">
              Vincular cuenta
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
