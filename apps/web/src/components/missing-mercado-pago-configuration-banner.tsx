import { useMutation } from '@tanstack/react-query'
import { TriangleAlertIcon } from 'lucide-react'
import { fetchMercadoPagoAuthorizationUrl } from '@/api/stores'
import { SubmitButton } from '@/components/submit-button'
import { useTenantStore } from '@/store/use-tenant-store'

export function MissingMercadoPagoConfigurationBanner() {
  const { store } = useTenantStore()

  if (!store) {
    return null
  }

  if (store.isConnectedToMercadoPago) {
    return null
  }

  return (
    <div className="dark bg-muted px-4 py-3 text-foreground">
      <div className="flex gap-2 md:items-center">
        <div className="flex grow gap-3 md:items-center">
          <div
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning-base max-md:mt-0.5"
          >
            <TriangleAlertIcon className="opacity-80" size={16} />
          </div>
          <div className="flex grow flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="space-y-0.5">
              <p className="font-medium text-sm">
                Configura tu cuenta de MercadoPago
              </p>
              <p className="text-muted-foreground text-sm">
                Para comenzar a recibir pagos, debes configurar tu cuenta de
                MercadoPago.
              </p>
            </div>
            <div className="flex gap-2 max-md:flex-wrap">
              <LinkToMercadoPagoButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LinkToMercadoPagoButton() {
  const { mutate, isPending } = useMutation({
    mutationKey: ['stores', 'mercado-pago', 'auth'],
    mutationFn: fetchMercadoPagoAuthorizationUrl,
    onSuccess: (authorizationUrl) => {
      window.location.href = authorizationUrl
    },
  })

  const linkToMercadoPago = () => {
    mutate()
  }

  return (
    <SubmitButton
      disabled={isPending}
      isSubmitting={isPending}
      onClick={linkToMercadoPago}
      size="sm"
      type="button"
    >
      Conectar con Mercado Pago
    </SubmitButton>
  )
}
