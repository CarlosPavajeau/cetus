import type { OrdersMetrics } from '@cetus/api-client/types/reports'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cetus/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@cetus/web/components/ui/chart'
import { useMemo } from 'react'
import { useNumberFormatter } from 'react-aria'
import { Label, Pie, PieChart } from 'recharts'

const orderStatusConfig = {
  confirmed: { label: 'Confirmadas', color: 'oklch(0.72 0.19 150)' },
  pending: { label: 'Pendientes', color: 'oklch(0.80 0.15 85)' },
  awaitingVerification: {
    label: 'Por verificar',
    color: 'oklch(0.70 0.15 250)',
  },
  rejected: { label: 'Rechazadas', color: 'oklch(0.64 0.21 25)' },
  canceled: { label: 'Canceladas', color: 'oklch(0.55 0.02 260)' },
} satisfies ChartConfig

type Props = {
  orders: OrdersMetrics
}

export function OrderStatusChart({ orders }: Readonly<Props>) {
  const numberFormat = useNumberFormatter()

  const orderStatusData = useMemo(
    () =>
      [
        {
          status: 'confirmed',
          value: orders.confirmed,
          fill: 'var(--color-confirmed)',
        },
        {
          status: 'pending',
          value: orders.pending,
          fill: 'var(--color-pending)',
        },
        {
          status: 'awaitingVerification',
          value: orders.awaitingVerification,
          fill: 'var(--color-awaitingVerification)',
        },
        {
          status: 'rejected',
          value: orders.rejected,
          fill: 'var(--color-rejected)',
        },
        {
          status: 'canceled',
          value: orders.canceled,
          fill: 'var(--color-canceled)',
        },
      ].filter((d) => d.value > 0),
    [orders],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado de ventas</CardTitle>
        <CardDescription>
          Distribución de {numberFormat.format(orders.total)} ventas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orders.total > 0 ? (
          <>
            <ChartContainer
              className="mx-auto aspect-square max-h-62.5"
              config={orderStatusConfig}
            >
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={orderStatusData}
                  dataKey="value"
                  innerRadius={60}
                  nameKey="status"
                  strokeWidth={5}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text
                            dominantBaseline="middle"
                            textAnchor="middle"
                            x={viewBox.cx}
                            y={viewBox.cy}
                          >
                            <tspan
                              className="fill-muted-foreground text-sm"
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) - 10}
                            >
                              Ventas
                            </tspan>
                            <tspan
                              className="fill-foreground font-medium text-xl"
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 15}
                            >
                              {numberFormat.format(orders.total)}
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="flex flex-col gap-3">
              {orderStatusData.map((item) => (
                <div
                  className="flex items-center justify-between"
                  key={item.status}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-1 rounded-full"
                      style={{
                        backgroundColor:
                          orderStatusConfig[
                            item.status as keyof typeof orderStatusConfig
                          ].color,
                      }}
                    />
                    <h6 className="font-medium text-sm leading-tight">
                      {
                        orderStatusConfig[
                          item.status as keyof typeof orderStatusConfig
                        ].label
                      }
                    </h6>
                  </div>
                  <div className="flex items-center gap-1">
                    <h6 className="font-medium text-sm">
                      {numberFormat.format(item.value)}
                    </h6>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-muted-foreground text-sm">
            Sin ventas registradas hoy.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
