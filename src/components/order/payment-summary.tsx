import type { Order } from '@/api/orders'
import { FormattedDate } from '@/components/formatted-date'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { usePaymentInfo } from '@/hooks/use-payment-info'
import { cn } from '@/shared/cn'
import {
  getMercadoPagoPaymentMethodLabel,
  getMercadoPagoPaymentStatusLabel,
} from '@/shared/mercado-pago'
import { BanknoteXIcon } from 'lucide-react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../ui/empty'
import { Skeleton } from '../ui/skeleton'

type Props = {
  order: Order
}

export function PaymentSummary({ order }: Readonly<Props>) {
  const { payment, isLoading } = usePaymentInfo(
    Number(order.transactionId || 0),
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
            {getMercadoPagoPaymentStatusLabel(payment.status)}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Id</span>

            <span>{payment.id}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Método de pago</span>

            <span>
              {getMercadoPagoPaymentMethodLabel(payment.payment_method_id)}
            </span>
          </div>

          {payment.date_created && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Iniciado el</span>

              <span>
                <FormattedDate date={new Date(payment.date_created)} />
              </span>
            </div>
          )}

          {payment.date_approved && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Aprobado el</span>

              <span>
                <FormattedDate date={new Date(payment.date_approved)} />
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
