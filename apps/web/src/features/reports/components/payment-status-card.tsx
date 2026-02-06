import type { PaymentStatusMetrics } from '@cetus/api-client/types/reports'
import { Card, CardContent, CardHeader, CardTitle } from '@cetus/ui/card'
import { getPaymentStatusLabel } from '@cetus/web/shared/payments'
import { useNumberFormatter } from 'react-aria'

type Props = {
  byPaymentStatus: PaymentStatusMetrics[]
}

export function PaymentStatusCard({ byPaymentStatus }: Readonly<Props>) {
  const currencyFormat = useNumberFormatter({
    style: 'currency',
    currency: 'COP',
  })
  const numberFormat = useNumberFormatter()
  const percentageFormat = useNumberFormatter({
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Estado de pagos</CardTitle>
      </CardHeader>
      <CardContent>
        {byPaymentStatus.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {byPaymentStatus.map((ps: PaymentStatusMetrics) => (
              <div
                className="flex items-center justify-between rounded-md border p-3"
                key={ps.status}
              >
                <div>
                  <p className="font-medium text-sm">
                    {getPaymentStatusLabel(ps.status)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {numberFormat.format(ps.orderCount)} ventas &middot;{' '}
                    {percentageFormat.format(ps.percentage / 100)}
                  </p>
                </div>
                <p className="font-medium font-mono text-sm tabular-nums">
                  {currencyFormat.format(ps.revenue)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Sin datos de pagos para hoy.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
