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
  WalletIcon,
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
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="font-semibold text-base">
          Información del pago
        </CardTitle>

        <Badge appearance="outline" variant={isPaid ? 'success' : 'warning'}>
          {isPaid ? <CheckCircle2Icon /> : <AlertCircleIcon />}
          {paymentStatusLabel(payment.status)}
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="flex items-center justify-between rounded-lg border bg-secondary/20 p-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-white shadow-sm">
              <WalletIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">
                {orderPaymentProviders[payment.paymentProvider] ??
                  payment.paymentProvider}
              </p>
              <p className="text-muted-foreground text-xs capitalize">
                {getPaymentMethodLabel(payment.paymentMethod)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID de transacción</span>
            <span className="font-mono">{order.transactionId}</span>
          </div>

          {payment.createdAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Iniciado el</span>
              <FormattedDate date={new Date(payment.createdAt)} />
            </div>
          )}

          {payment.approvedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Aprobado el</span>
              <FormattedDate date={new Date(payment.approvedAt)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
