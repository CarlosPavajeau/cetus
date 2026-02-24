import type { ChannelMetrics } from '@cetus/api-client/types/reports'
import { getSaleChannelLabel } from '@cetus/shared/constants/order'
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
import { Bar, BarChart, XAxis, YAxis } from 'recharts'

const channelColors = [
  'oklch(0.70 0.17 250)',
  'oklch(0.72 0.19 150)',
  'oklch(0.80 0.15 85)',
  'oklch(0.64 0.21 25)',
  'oklch(0.55 0.02 260)',
]

function getChannelLabel(channel: string) {
  if (channel === 'ecommerce') {
    return 'E-commerce'
  }
  return getSaleChannelLabel(channel)
}

type Props = {
  byChannel: ChannelMetrics[]
}

export function ChannelRevenueChart({ byChannel }: Readonly<Props>) {
  const currencyFormat = useNumberFormatter({
    style: 'currency',
    currency: 'COP',
  })

  const channelChartData = useMemo(
    () =>
      byChannel.map((ch, i) => ({
        channel: getChannelLabel(ch.channel),
        revenue: ch.revenue,
        orderCount: ch.orderCount,
        fill: channelColors[i % channelColors.length],
      })),
    [byChannel],
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
              accessibilityLayer
              barCategoryGap="30%"
              data={channelChartData}
              layout="vertical"
              margin={{ left: 0, right: 16 }}
            >
              <YAxis
                axisLine={false}
                dataKey="channel"
                tickLine={false}
                tickMargin={10}
                type="category"
                width={90}
              />
              <XAxis
                axisLine={false}
                hide
                tickLine={false}
                tickMargin={10}
                type="number"
              />
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
              <Bar dataKey="revenue" radius={2} />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="py-8 text-center text-muted-foreground text-sm">
            Sin datos de canales para hoy.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
