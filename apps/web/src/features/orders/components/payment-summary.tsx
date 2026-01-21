import type { Order } from '@cetus/api-client/types/orders'
import { orderPaymentProviders } from '@cetus/shared/constants/order'
import { Badge } from '@cetus/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@cetus/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { Skeleton } from '@cetus/ui/skeleton'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { Button } from '@cetus/web/components/ui/button'
import { Label } from '@cetus/web/components/ui/label'
import { orderQueries } from '@cetus/web/features/orders/queries'
import {
  getPaymentMethodLabel,
  paymentStatusLabel,
} from '@cetus/web/shared/payments'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircleIcon,
  BanknoteXIcon,
  CheckCircle2Icon,
  CopyIcon,
} from 'lucide-react'

type Props = {
  order: Order
}

export function PaymentSummary({ order }: Readonly<Props>) {
  const { data: payment, isLoading } = useQuery(
    orderQueries.payment.info(order.id),
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Información del pago</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-3 text-sm">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!payment) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BanknoteXIcon />
          </EmptyMedia>
          <EmptyTitle>Sin información de pago</EmptyTitle>
          <EmptyDescription>
            No se ha encontrado información de pago para este pedido.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const isPaid = payment.status === 'approved' || payment.status === 'APPROVED'

  return (
    <Card className="p-4">
      <div className="flex flex-row items-center justify-between">
        <h3 className="font-semibold">Información del pago</h3>

        <Badge appearance="outline" variant={isPaid ? 'success' : 'warning'}>
          {isPaid ? <CheckCircle2Icon /> : <AlertCircleIcon />}
          {paymentStatusLabel(payment.status)}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border bg-secondary/20 p-3">
          <div className="flex items-center space-x-3">
            <div>
              <p className="font-medium text-sm">
                {getPaymentMethodLabel(payment.paymentMethod)}
              </p>
              <p className="text-muted-foreground text-xs">Método de pago</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <Label className="mb-1 block font-medium text-xs uppercase tracking-wide">
                Id de transacción
              </Label>
              <div className="flex items-center gap-2">
                <code className="max-w-45 truncate rounded border border-border px-2 py-1 font-mono text-xs">
                  {order.transactionId}
                </code>

                <Button
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    navigator.clipboard.writeText(payment.transactionId)
                  }
                  size="icon"
                  variant="ghost"
                >
                  <CopyIcon className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-border border-t pt-4">
          <Label className="mb-1 block font-medium text-xs uppercase tracking-wide">
            Proveedor
          </Label>

          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm">
                {orderPaymentProviders[payment.paymentProvider] ??
                  payment.paymentProvider}
              </div>
              <div className="text-muted-foreground text-xs">
                Gateway de pago
              </div>
            </div>
            <Badge appearance="light" variant="success">
              Activo
            </Badge>
          </div>
        </div>

        {(payment.createdAt || payment.approvedAt) && (
          <div className="border-border border-t pt-4">
            <Label className="mb-1 block font-medium text-xs uppercase tracking-wide">
              Eventos
            </Label>
            <div className="space-y-3">
              {payment.createdAt && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-muted-foreground text-xs">
                      Iniciado el
                    </div>
                    <div className="font-medium text-sm">
                      <FormattedDate date={new Date(payment.createdAt)} />
                    </div>
                  </div>
                </div>
              )}
              {payment.approvedAt && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-muted-foreground text-xs">
                      Aprobado el
                    </div>
                    <div className="font-medium text-sm">
                      <FormattedDate date={new Date(payment.approvedAt)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
