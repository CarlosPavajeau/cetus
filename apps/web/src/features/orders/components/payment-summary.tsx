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
  paymentStatusLabel,
} from '@cetus/web/shared/payments'
import { cn } from '@cetus/web/shared/utils'
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
    <Card>
      <CardHeader>
        <CardTitle>Información del pago</CardTitle>
        <CardAction>
          <Badge
            className={cn({
              'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300':
                isPaid,
            })}
            variant={isPaid ? 'secondary' : 'destructive'}
          >
            {isPaid ? <CheckCircle2Icon /> : <AlertCircleIcon />}
            {paymentStatusLabel(payment.status)}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Método de pago
          </span>
          <p className="font-medium text-sm">
            {getPaymentMethodLabel(payment.paymentMethod)}
          </p>
        </div>

        {payment.paymentProvider !== 'manual' && (
          <>
            <Separator />

            <div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
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
                  <CopyIcon className="size-3.5" />
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
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
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
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
