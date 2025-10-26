import { BanknoteXIcon } from 'lucide-react'
import { getPaymentProviderName, type Order } from '@/api/orders'
import { FormattedDate } from '@/components/formatted-date'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrderPaymentInfo } from '@/hooks/use-order-payment-info'
import { cn } from '@/shared/cn'
import { getPaymentMethodLabel, paymentStatusLabel } from '@/shared/payments'

type Props = {
  order: Order
}

export function PaymentSummary({ order }: Readonly<Props>) {
  const { payment, isLoading } = useOrderPaymentInfo(order.id)

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

            <span>{getPaymentProviderName(payment.paymentProvider)}</span>
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
