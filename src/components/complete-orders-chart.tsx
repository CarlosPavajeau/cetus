import { OrderStatus } from '@/api/orders'
import { useOrders } from '@/hooks/user-orders'
import { useId } from 'react'
import { useDateFormatter } from 'react-aria'
import {
  CartesianGrid,
  Line,
  LineChart,
  Rectangle,
  XAxis,
  YAxis,
} from 'recharts'
import { CustomTooltipContent } from './charts-extra'
import { DefaultLoader } from './default-loader'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { type ChartConfig, ChartContainer, ChartTooltip } from './ui/chart'

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
  const id = useId()

  const formatter = useDateFormatter({
    month: 'short',
    day: 'numeric',
  })

  if (isLoading) {
    return <DefaultLoader />
  }

  if (!orders) {
    return null
  }

  const completeOrders = orders.filter(
    (order) => order.status === OrderStatus.Delivered,
  )

  // Group orders by date and count them
  const chartData = completeOrders
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

  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="space-y-0.5">
          <CardTitle>Ordenes completadas</CardTitle>
          <div className="flex items-start gap-2">
            <div className="font-semibold text-2xl">
              {completeOrders.length}
            </div>
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
              <linearGradient id={`${id}-gradient`} x1="0" y1="0" x2="1" y2="0">
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
                    projected: 'var(--chart-3)',
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
              stroke={`url(#${id}-gradient)`}
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
    </Card>
  )
}
