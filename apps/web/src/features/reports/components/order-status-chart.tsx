import type { OrdersMetrics } from '@cetus/api-client/types/reports'
import { Card, CardContent, CardHeader, CardTitle } from '@cetus/ui/card'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { cn } from '@cetus/web/shared/utils'
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  ClockIcon,
  MinusCircleIcon,
  XCircleIcon,
} from 'lucide-react'
import { useMemo } from 'react'
import { useNumberFormatter } from 'react-aria'

const statusConfig = [
  {
    key: 'confirmed' as const,
    label: 'Confirmadas',
    color: 'oklch(0.72 0.19 150)',
    Icon: CheckCircle2Icon,
  },
  {
    key: 'pending' as const,
    label: 'Pendientes',
    color: 'oklch(0.80 0.15 85)',
    Icon: ClockIcon,
  },
  {
    key: 'awaitingVerification' as const,
    label: 'Por verificar',
    color: 'oklch(0.70 0.15 250)',
    Icon: AlertCircleIcon,
  },
  {
    key: 'rejected' as const,
    label: 'Rechazadas',
    color: 'oklch(0.64 0.21 25)',
    Icon: XCircleIcon,
  },
  {
    key: 'canceled' as const,
    label: 'Canceladas',
    color: 'oklch(0.55 0.02 260)',
    Icon: MinusCircleIcon,
  },
] as const

type Props = {
  orders: OrdersMetrics
}

export function OrderStatusChart({ orders }: Readonly<Props>) {
  const numberFormat = useNumberFormatter()
  const percentageFormat = useNumberFormatter({
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  const statusData = useMemo(
    () =>
      statusConfig
        .map((s) => ({
          ...s,
          count: orders[s.key],
          percentage: orders.total > 0 ? (orders[s.key] / orders.total) * 100 : 0,
        }))
        .filter((s) => s.count > 0),
    [orders],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado de ventas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {orders.total > 0 ? (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total de ventas
              </p>
              <p className="mt-1 font-bold font-mono text-2xl tabular-nums">
                {numberFormat.format(orders.total)}
              </p>
            </div>

            <div className="flex h-2 w-full overflow-hidden rounded-full">
              {statusData.map((item) => (
                <div
                  key={item.key}
                  className="h-full"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {statusData.map((item) => (
                <div key={item.key} className="flex items-center gap-1.5">
                  <div
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col">
              {statusData.map((item, i) => (
                <div
                  key={item.key}
                  className={cn(
                    'flex items-center gap-3 py-2.5',
                    i > 0 && 'border-t',
                  )}
                >
                  <item.Icon
                    className="size-4 shrink-0"
                    style={{ color: item.color }}
                  />
                  <span className="flex-1 text-sm">{item.label}</span>
                  <span className="font-medium font-mono text-sm tabular-nums">
                    {numberFormat.format(item.count)}
                  </span>
                  <span className="w-12 text-right text-xs text-muted-foreground">
                    {percentageFormat.format(item.percentage / 100)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardListIcon />
              </EmptyMedia>
              <EmptyTitle>Sin ventas registradas</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  )
}
