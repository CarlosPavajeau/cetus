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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-lg">Resumen de la transacción</h2>

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
      </div>

      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Id</span>
          <span>{transaction.data.id}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Método de pago</span>
          <span>
            {TransactionPaymentMethodText[transaction.data.payment_method_type]}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Monto</span>
          <span>
            <Currency
              value={transaction.data.amount_in_cents / 100}
              currency="COP"
            />
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Fecha</span>
          <span>
            <FormattedDate date={new Date(transaction.data.created_at)} />
          </span>
        </div>
      </div>
    </div>
  )
}
