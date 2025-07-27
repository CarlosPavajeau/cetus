import { fetchMercadoPagoAuthorizationUrl } from '@/api/stores'
import { Button } from '@/components/ui/button'
import { GetSession } from '@/server/get-session'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { ShoppingCartIcon } from 'lucide-react'

export const Route = createFileRoute('/onboarding/mercado-pago/link')({
  beforeLoad: async () => {
    const { session } = await GetSession()

    if (!session) {
      throw redirect({
        to: '/sign-in',
      })
    }

    if (!session.activeOrganizationId) {
      throw redirect({
        to: '/app',
      })
    }
  },
  loader: async () => {
    const authorizationUrl = await fetchMercadoPagoAuthorizationUrl()

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
    <div className="h-screen p-2">
      <header className="lef-0 absolute top-0 z-30 w-full">
        <div className="p-6 md:p-8">
          <ShoppingCartIcon className="h-8 w-auto" />
        </div>
      </header>

      <div className="flex h-full">
        <div className="relative w-full">
          <div className="relative z-10 flex h-full items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8">
              <div className="text-center">
                <h1 className="mb-2 font-heading text-lg">
                  Un último paso antes de empezar
                </h1>

                <p className="mb-8 text-muted-foreground text-sm">
                  Vincula tu cuenta de Mercado Pago para aceptar pagos en tu
                  tienda.
                </p>
              </div>

              <div className="space-y-6">
                <Button
                  size="lg"
                  onClick={goToMercadoPagoLink}
                  className="w-full"
                >
                  Continuar con Mercado Pago
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
