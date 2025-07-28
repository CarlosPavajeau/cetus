import { usePaymentInfo } from '@/hooks/use-payment-info'
import { cn } from '@/shared/cn'
import { Currency } from '../currency'
import { DefaultLoader } from '../default-loader'
import { FormattedDate } from '../formatted-date'
import { Badge } from '../ui/badge'

type Props = {
  id: number
}

export function PaymentSummary({ id }: Props) {
  const { payment, isLoading } = usePaymentInfo(id)

  if (isLoading) {
    return <DefaultLoader />
  }

  if (!payment) {
    return null
  }

  return (
    <div className="space-y-3 rounded-md border bg-card p-4">
      <div className="flex justify-between">
        <h3 className="font-medium">Estado del pago</h3>

        <Badge variant="outline">
          <span
            className={cn('size-1.5 rounded-full bg-success-base')}
            aria-hidden="true"
          ></span>
          {payment.status}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Id</span>

          <span>{payment.id}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Método de pago</span>

          <span>{payment.payment_method?.id}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Monto</span>

          <span>
            <Currency value={payment.net_amount || 0} currency="COP" />
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Fecha</span>

          <span>
            <FormattedDate date={new Date(payment.date_approved!)} />
          </span>
        </div>
      </div>
    </div>
  )
}
