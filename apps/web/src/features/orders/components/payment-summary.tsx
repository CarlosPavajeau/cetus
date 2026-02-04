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
import { Separator } from '@cetus/ui/separator'
import { Skeleton } from '@cetus/ui/skeleton'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { Button } from '@cetus/web/components/ui/button'
import { orderQueries } from '@cetus/web/features/orders/queries'
import {
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from '@cetus/web/shared/payments'
import { cn } from '@cetus/web/shared/utils'
import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  MoneyNotFound02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useQuery } from '@tanstack/react-query'

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
            <HugeiconsIcon icon={MoneyNotFound02Icon} />
          </EmptyMedia>
          <EmptyTitle>Sin información de pago</EmptyTitle>
          <EmptyDescription>
            No se ha encontrado información de pago para este pedido.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const isPaid = order.paymentStatus === 'verified'
  const isPending =
    order.paymentStatus === 'pending' ||
    order.paymentStatus === 'awaiting_verification'

  return (
    <Card className="gap-0">
      <CardHeader>
        <CardTitle>Información del pago</CardTitle>
        <CardAction>
          <Badge
            className={cn({
              'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300':
                isPaid,
              'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300':
                isPending,
            })}
            variant={
              order.paymentStatus === 'rejected' ? 'destructive' : 'secondary'
            }
          >
            {isPaid ? (
              <HugeiconsIcon icon={CheckmarkCircle02Icon} />
            ) : (
              <HugeiconsIcon icon={AlertCircleIcon} />
            )}
            {getPaymentStatusLabel(order.paymentStatus)}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <span className="text-muted-foreground text-xs uppercase tracking-wide">
            Método de pago
          </span>
          <p className="font-medium text-sm">
            {getPaymentMethodLabel(order.paymentMethod)}
          </p>
        </div>

        {order.paymentProvider !== 'manual' && (
          <>
            <Separator />

            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Id de transacción
              </span>
              <div className="flex items-center gap-2">
                <code className="max-w-45 truncate rounded border border-border px-2 py-1 font-mono text-xs">
                  {payment.transactionId}
                </code>
                <Button
                  onClick={() =>
                    navigator.clipboard.writeText(payment.transactionId)
                  }
                  size="icon"
                  variant="ghost"
                >
                  <HugeiconsIcon icon={Copy01Icon} />
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Proveedor
              </span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">
                  {orderPaymentProviders[payment.paymentProvider] ??
                    payment.paymentProvider}
                </span>
                <Badge>Activo</Badge>
              </div>
            </div>

            {(payment.createdAt || payment.approvedAt) && (
              <>
                <Separator />

                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    Eventos
                  </span>
                  <div className="mt-1 space-y-2">
                    {payment.createdAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Iniciado</span>
                        <span className="font-medium">
                          <FormattedDate date={new Date(payment.createdAt)} />
                        </span>
                      </div>
                    )}
                    {payment.approvedAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Aprobado</span>
                        <span className="font-medium">
                          <FormattedDate date={new Date(payment.approvedAt)} />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
