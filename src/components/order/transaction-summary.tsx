import {
  TransactionPaymentMethodText,
  TransactionStatusColor,
  TransactionStatusText,
} from '@/api/third-party/wompi'
import { Currency } from '@/components/currency'
import { DefaultLoader } from '@/components/default-loader'
import { FormattedDate } from '@/components/formatted-date'
import { Badge } from '@/components/ui/badge'
import { useTransaction } from '@/hooks/wompi/use-transaction'
import { cn } from '@/shared/cn'

type Props = {
  id: string
}

export function TransactionSummary({ id }: Props) {
  const { transaction, isLoading } = useTransaction(id)

  if (isLoading) {
    return <DefaultLoader />
  }

  if (!transaction) {
    return null
  }

  return (
    <div className="space-y-3 rounded-md border bg-card p-4">
      <h3 className="font-medium">Resumen de la transacción</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Estado</span>

          <span>
            <Badge variant="outline">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  TransactionStatusColor[transaction.data.status],
                )}
                aria-hidden="true"
              ></span>
              {TransactionStatusText[transaction.data.status]}
            </Badge>
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Id</span>

          <span>{transaction.data.id}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Método de pago</span>

          <span>
            {TransactionPaymentMethodText[transaction.data.payment_method_type]}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Monto</span>

          <span>
            <Currency
              value={transaction.data.amount_in_cents / 100}
              currency="COP"
            />
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Fecha</span>

          <span>
            <FormattedDate date={new Date(transaction.data.created_at)} />
          </span>
        </div>
      </div>
    </div>
  )
}
