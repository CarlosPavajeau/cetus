import { createFileRoute } from '@tanstack/react-router'
import { CheckIcon } from 'lucide-react'
import { ConnectToMercadoPagoButton } from '@/components/connect-to-mercado-pago-button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item'
import { ConfigureWompiCredentialsForm } from '@/components/wompi/configure-wompi-credentials-form'
import { useTenantStore } from '@/store/use-tenant-store'

export const Route = createFileRoute('/app/payments')({
  component: RouteComponent,
})

function RouteComponent() {
  const { store } = useTenantStore()
  const isConnectedToMercadoPago = store?.isConnectedToMercadoPago ?? false

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="scroll-m-20 font-heading font-semibold text-2xl tracking-tight">
          Configuración de pagos
        </h2>
        <p className="text-balance text-[1.05rem] text-muted-foreground sm:text-base">
          Realiza la configuración de los métodos de pago disponibles en la
          aplicación.
        </p>
      </div>

      <Item variant="outline">
        <ItemContent>
          <ItemTitle>
            Mercado Pago
            {isConnectedToMercadoPago && (
              <Badge variant="outline">
                <CheckIcon />
                Conectado
              </Badge>
            )}
          </ItemTitle>
          <ItemDescription>
            Configura tus credenciales de Mercado Pago para recibir pagos en tu
            aplicación.
          </ItemDescription>
        </ItemContent>

        {!isConnectedToMercadoPago && (
          <ItemActions>
            <ConnectToMercadoPagoButton />
          </ItemActions>
        )}
      </Item>

      <Card>
        <CardHeader>
          <CardTitle>Wompi</CardTitle>
          <CardDescription>
            Configura tus credenciales de Wompi para recibir pagos en tu
            aplicación.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ConfigureWompiCredentialsForm />
        </CardContent>
      </Card>
    </div>
  )
}
