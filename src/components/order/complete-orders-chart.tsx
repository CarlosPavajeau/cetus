import { OrderStatus } from '@/api/orders'
import { CustomTooltipContent } from '@/components/charts-extra'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrdersSummary } from '@/hooks/orders'
import { useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useDateFormatter } from 'react-aria'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Rectangle,
  XAxis,
  YAxis,
} from 'recharts'

const chartConfig = {
  actual: {
    label: 'Ordenes completadas',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

interface CustomCursorProps {
  fill?: string
  pointerEvents?: string
  height?: number
  points?: Array<{ x: number; y: number }>
  className?: string
}

function CustomCursor(props: CustomCursorProps) {
  const { fill, pointerEvents, height, points, className } = props

  if (!points || points.length === 0) {
    return null
  }

  const { x, y } = points[0]!
  return (
    <>
      <Rectangle
        x={x - 12}
        y={y}
        fill={fill}
        pointerEvents={pointerEvents}
        width={24}
        height={height}
        className={className}
        type="linear"
      />
      <Rectangle
        x={x - 1}
        y={y}
        fill={fill}
        pointerEvents={pointerEvents}
        width={1}
        height={height}
        className="recharts-tooltip-inner-cursor"
        type="linear"
      />
    </>
  )
}

export function CompleteOrdersChart() {
  const { month } = useSearch({
    from: '/app/dashboard/',
  })
  const { isLoading, summary } = useOrdersSummary(month)
  const dayFormmatter = useDateFormatter({
    day: 'numeric',
  })
  const monthFormatter = useDateFormatter({
    month: 'short',
    day: 'numeric',
  })

  const { chartData } = useMemo(() => {
    if (!summary) {
      return {
        chartData: [],
      }
    }

    const completeOrders = summary.filter(
      (order) => order.status === OrderStatus.Delivered,
    )

    const data = completeOrders
      .reduce(
        (acc, order) => {
          const date = new Date(order.createdAt).toLocaleDateString()
          const existing = acc.find((item) => item.createdAt === date)

          if (existing) {
            existing.count += 1
          } else {
            acc.push({
              createdAt: date,
              count: 1,
            })
          }

          return acc
        },
        [] as Array<{ createdAt: string; count: number }>,
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )

    return {
      chartData: data,
    }
  }, [summary])

  if (isLoading) {
    return (
      <div className="col-span-4">
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (!summary) {
    return null
  }

  if (chartData.length === 0) {
    return (
      <Card className="col-span-4 overflow-hidden rounded-md py-0">
        <CardHeader className="px-6 pt-6 pb-0">
          <CardTitle>Pedidos completados</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-4 overflow-hidden rounded-md py-0">
      <CardHeader className="px-6 pt-6 pb-0">
        <CardTitle>Pedidos completados</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-full min-h-72 w-full [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-(--chart-1)/15 [&_.recharts-rectangle.recharts-tooltip-inner-cursor]:fill-white/20"
        >
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{ left: -12, right: 12, top: 12 }}
          >
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.8}
                />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="2 2"
              stroke="var(--border)"
            />
            <XAxis
              dataKey="createdAt"
              tickLine={false}
              tickMargin={12}
              tickFormatter={(value) => dayFormmatter.format(new Date(value))}
              stroke="var(--border)"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />

            <ChartTooltip
              content={
                <CustomTooltipContent
                  labelFormatter={(label) =>
                    monthFormatter.format(new Date(label))
                  }
                  colorMap={{
                    count: 'var(--chart-1)',
                  }}
                  labelMap={{
                    count: 'Ordenes',
                  }}
                  dataKeys={['count']}
                  valueFormatter={(value) => `${value.toLocaleString()}`}
                />
              }
              cursor={<CustomCursor fill="var(--chart-1)" />}
            />

            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--chart-1)"
              fillOpacity={1}
              fill="url(#colorGradient)"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: 'var(--chart-1)',
                stroke: 'var(--background)',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
