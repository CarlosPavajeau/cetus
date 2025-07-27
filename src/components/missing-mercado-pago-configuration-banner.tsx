import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app'
import { TriangleAlertIcon } from 'lucide-react'

export function MissingMercadoPagoConfigurationBanner() {
  const { currentStore } = useAppStore()

  if (!currentStore) {
    return null
  }

  if (currentStore.isConnectedToMercadoPago) {
    return null
  }

  return (
    <div className="dark bg-muted px-4 py-3 text-foreground">
      <div className="flex gap-2 md:items-center">
        <div className="flex grow gap-3 md:items-center">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning-base max-md:mt-0.5"
            aria-hidden="true"
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
              <Button size="sm" className="text-sm">
                Configurar ahora
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
