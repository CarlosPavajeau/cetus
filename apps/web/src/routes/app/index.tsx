import { api } from '@cetus/api-client'
import type { PaymentStatusMetrics } from '@cetus/api-client/types/reports'
import { getSaleChannelLabel } from '@cetus/shared/constants/order'
import { getImageUrl } from '@cetus/shared/utils/image'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cetus/ui/card'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { Button } from '@cetus/web/components/ui/button'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@cetus/web/components/ui/chart'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@cetus/web/components/ui/item'
import { StatsCard } from '@cetus/web/features/reports/components/stats-card'
import { getPaymentStatusLabel } from '@cetus/web/shared/payments'
import { Refresh01FreeIcons } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Image } from '@unpic/react'
import { useMemo } from 'react'
import { useNumberFormatter } from 'react-aria'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'

export const Route = createFileRoute('/app/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ['reports', 'daily-summary'],
      queryFn: () => api.reports.getDailySummary(),
    })
  },
  component: RouteComponent,
})

function getChannelLabel(channel: string) {
  if (channel === 'ecommerce') {
    return 'E-commerce'
  }
  return getSaleChannelLabel(channel)
}

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

const channelColors = [
  'oklch(0.70 0.17 250)',
  'oklch(0.72 0.19 150)',
  'oklch(0.80 0.15 85)',
  'oklch(0.64 0.21 25)',
  'oklch(0.55 0.02 260)',
]

function RouteComponent() {
  const { data, dataUpdatedAt, refetch } = useSuspenseQuery({
    queryKey: ['reports', 'daily-summary'],
    queryFn: () => api.reports.getDailySummary(),
  })

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

  const orderStatusData = useMemo(
    () =>
      [
        {
          status: 'confirmed',
          value: data.orders.confirmed,
          fill: 'var(--color-confirmed)',
        },
        {
          status: 'pending',
          value: data.orders.pending,
          fill: 'var(--color-pending)',
        },
        {
          status: 'awaitingVerification',
          value: data.orders.awaitingVerification,
          fill: 'var(--color-awaitingVerification)',
        },
        {
          status: 'rejected',
          value: data.orders.rejected,
          fill: 'var(--color-rejected)',
        },
        {
          status: 'canceled',
          value: data.orders.canceled,
          fill: 'var(--color-canceled)',
        },
      ].filter((d) => d.value > 0),
    [data.orders],
  )

  const channelChartData = useMemo(
    () =>
      data.byChannel.map((ch, i) => ({
        channel: getChannelLabel(ch.channel),
        revenue: ch.revenue,
        orderCount: ch.orderCount,
        fill: channelColors[i % channelColors.length],
      })),
    [data.byChannel],
  )

  const channelConfig = useMemo(() => {
    const config: ChartConfig = {}
    for (const item of channelChartData) {
      config[item.channel] = { label: item.channel, color: item.fill }
    }
    config.revenue = { label: 'Ingresos' }
    return config
  }, [channelChartData])

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="font-heading font-medium text-2xl">Resumen del día</h1>
        <div className="flex items-center gap-2">
          <small className="text-muted-foreground text-sm">
            Última actualización:{' '}
            <FormattedDate date={new Date(dataUpdatedAt)} />
          </small>

          <Button onClick={() => refetch()} size="xs" variant="outline">
            <HugeiconsIcon data-icon="inline-start" icon={Refresh01FreeIcons} />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          format={(value) => numberFormat.format(value)}
          title="Ventas del día"
          value={data.orders.total}
        />
        <StatsCard
          format={(value) => currencyFormat.format(value)}
          title="Ingresos confirmados"
          value={data.revenue.confirmed}
        />
        <StatsCard
          format={(value) => currencyFormat.format(value)}
          title="Ingresos pendientes"
          value={data.revenue.pending}
        />
        <StatsCard
          format={(value) => numberFormat.format(value)}
          title="Ventas por cobrar"
          value={data.orders.pending}
        />
      </div>

      <div className="rounded-md bg-muted/50 p-4">
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Total del día:{' '}
            <span className="font-semibold text-foreground">
              {currencyFormat.format(data.revenue.total)}
            </span>
          </p>
          <p className="text-muted-foreground">
            Tasa de confirmación:{' '}
            <span className="font-semibold text-foreground">
              {data.orders.total > 0 &&
                percentageFormat.format(
                  data.orders.confirmed / data.orders.total,
                )}
            </span>
          </p>
        </div>
      </div>
      {data.topProduct && (
        <div className="flex flex-col gap-2">
          <p className="font-medium">Producto más vendido</p>

          <Item variant="outline">
            <ItemMedia variant="image">
              <Image
                alt={data.topProduct.productName}
                className="object-cover"
                height={80}
                layout="constrained"
                objectFit="cover"
                src={getImageUrl(data.topProduct.imageUrl || 'placeholder.svg')}
                width={80}
              />
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="line-clamp-1">
                {data.topProduct.productName}
              </ItemTitle>
              <ItemDescription>
                {numberFormat.format(data.topProduct.quantitySold)} vendidos
                &middot; {currencyFormat.format(data.topProduct.revenue)}
              </ItemDescription>
            </ItemContent>
          </Item>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estado de ventas</CardTitle>
            <CardDescription>
              Distribución de {numberFormat.format(data.orders.total)} ventas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.orders.total > 0 ? (
              <>
                <ChartContainer
                  className="mx-auto aspect-square max-h-62.5"
                  config={orderStatusConfig}
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
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
                                  {numberFormat.format(data.orders.total)}
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

        <Card>
          <CardHeader>
            <CardTitle>Ventas por canal</CardTitle>
            <CardDescription>Ingresos por canal de venta</CardDescription>
          </CardHeader>
          <CardContent>
            {channelChartData.length > 0 ? (
              <ChartContainer
                className="aspect-auto h-62.5 w-full"
                config={channelConfig}
              >
                <BarChart
                  data={channelChartData}
                  layout="vertical"
                  margin={{ left: 0, right: 16 }}
                >
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    axisLine={false}
                    dataKey="channel"
                    tickLine={false}
                    tickMargin={8}
                    type="category"
                    width={90}
                  />
                  <XAxis hide type="number" />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          currencyFormat.format(value as number)
                        }
                        hideLabel
                      />
                    }
                  />
                  <Bar dataKey="revenue" radius={4}>
                    {channelChartData.map((entry) => (
                      <Cell fill={entry.fill} key={entry.channel} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="py-8 text-center text-muted-foreground text-sm">
                Sin datos de canales para hoy.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Estado de pagos</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byPaymentStatus.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.byPaymentStatus.map((ps: PaymentStatusMetrics) => (
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
      </div>
    </div>
  )
}
