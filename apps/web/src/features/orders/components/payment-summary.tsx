import type { Order } from '@cetus/api-client/types/orders'
import { orderPaymentProviders } from '@cetus/shared/constants/order'
import { Badge } from '@cetus/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cetus/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { Skeleton } from '@cetus/ui/skeleton'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { orderQueries } from '@cetus/web/features/orders/queries'
import {
  getPaymentMethodLabel,
  paymentStatusLabel,
} from '@cetus/web/shared/payments'
import { cn } from '@cetus/web/shared/utils'
import { useQuery } from '@tanstack/react-query'
import { BanknoteXIcon } from 'lucide-react'

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del pago</CardTitle>
        <CardAction>
          <Badge variant="outline">
            <span
              aria-hidden="true"
              className={cn('size-1.5 rounded-full bg-success-base')}
            />
            {paymentStatusLabel(payment.status)}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Id</span>

            <span>{payment.transactionId}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Proveedor</span>

            <span>{orderPaymentProviders[payment.paymentProvider]}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Método de pago</span>

            <span>{getPaymentMethodLabel(payment.paymentMethod)}</span>
          </div>

          {payment.createdAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Iniciado el</span>

              <span>
                <FormattedDate date={new Date(payment.createdAt)} />
              </span>
            </div>
          )}

          {payment.approvedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Aprobado el</span>

              <span>
                <FormattedDate date={new Date(payment.approvedAt)} />
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
