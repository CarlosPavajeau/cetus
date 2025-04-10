import { OrderStatus } from '@/api/orders'
import { CustomTooltipContent } from '@/components/charts-extra'
import { DefaultLoader } from '@/components/default-loader'
import { OrdersInsights } from '@/components/order/orders-insights'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import { useOrders } from '@/hooks/orders'
import { useMemo } from 'react'
import { useDateFormatter } from 'react-aria'
import {
  CartesianGrid,
  Line,
  LineChart,
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
  const { isLoading, orders } = useOrders()
  const formatter = useDateFormatter({
    month: 'short',
    day: 'numeric',
  })

  const { chartData, completeOrdersCount } = useMemo(() => {
    if (!orders) {
      return {
        chartData: [],
        completeOrdersCount: 0,
      }
    }

    const completeOrders = orders.filter(
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
      completeOrdersCount: completeOrders.length,
    }
  }, [orders])

  if (isLoading) {
    return <DefaultLoader />
  }

  if (!orders) {
    return null
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="space-y-0.5">
          <CardTitle>Ordenes completadas</CardTitle>
          <div className="flex items-start gap-2">
            <div className="font-semibold text-2xl">{completeOrdersCount}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-60 w-full [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-(--chart-1)/15 [&_.recharts-rectangle.recharts-tooltip-inner-cursor]:fill-white/20"
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ left: -12, right: 12, top: 12 }}
          >
            <defs>
              <linearGradient id="chart-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--chart-2)" />
                <stop offset="100%" stopColor="var(--chart-1)" />
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
              tickFormatter={(value) => formatter.format(new Date(value))}
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
                  labelFormatter={(label) => formatter.format(new Date(label))}
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

            <Line
              type="linear"
              dataKey="count"
              stroke="url(#chart-gradient)"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: 'var(--chart-1)',
                stroke: 'var(--background)',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>

      <CardFooter className="mt-4 flex flex-wrap items-center gap-2">
        <OrdersInsights />
      </CardFooter>
    </Card>
  )
}
