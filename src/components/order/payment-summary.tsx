import { Currency } from '@/components/currency'
import { DefaultLoader } from '@/components/default-loader'
import { FormattedDate } from '@/components/formatted-date'
import { Badge } from '@/components/ui/badge'
import { usePaymentInfo } from '@/hooks/use-payment-info'
import { cn } from '@/shared/cn'
import {
  getMercadoPagoPaymentFeeLabel,
  getMercadoPagoPaymentMethodLabel,
  getMercadoPagoPaymentStatusLabel,
} from '@/shared/mercado-pago'

type Props = {
  id: number
}

export function PaymentSummary({ id }: Readonly<Props>) {
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
        <h3 className="font-medium">Información del pago</h3>

        <Badge variant="outline">
          <span
            aria-hidden="true"
            className={cn('size-1.5 rounded-full bg-success-base')}
          />
          {getMercadoPagoPaymentStatusLabel(payment.status)}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
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

        <div className="flex justify-between">
          <span className="text-muted-foreground">Monto</span>

          <span className="text-success-base">
            + <Currency currency="COP" value={payment.net_amount || 0} />
          </span>
        </div>

        {payment.fee_details?.map((fee) => (
          <div className="flex justify-between" key={fee.type}>
            <span className="text-muted-foreground">
              {getMercadoPagoPaymentFeeLabel(fee.type)}
            </span>

            <span className="text-error-base">
              - <Currency currency="COP" value={fee.amount || 0} />
            </span>
          </div>
        ))}

        <div className="flex justify-between">
          <span className="text-muted-foreground">Cantidad neta recibida</span>

          <span className="font-medium text-success-base">
            <Currency
              currency="COP"
              value={payment.transaction_details?.net_received_amount || 0}
            />
          </span>
        </div>

        {payment.date_created && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha de creación</span>

            <span>
              <FormattedDate date={new Date(payment.date_created)} />
            </span>
          </div>
        )}

        {payment.date_approved && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha de aprobación</span>

            <span>
              <FormattedDate date={new Date(payment.date_approved)} />
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
