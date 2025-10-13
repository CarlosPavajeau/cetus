import { OrderStatus } from '@/api/orders'
import { CustomTooltipContent } from '@/components/charts-extra'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrdersSummary } from '@/hooks/orders'
import { useSearch } from '@tanstack/react-router'
import { ChartNoAxesCombinedIcon } from 'lucide-react'
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../ui/empty'

const chartConfig = {
  actual: {
    label: 'Ordenes completadas',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

type CustomCursorProps = {
  fill?: string
  pointerEvents?: string
  height?: number
  points?: Array<{ x: number; y: number }>
  className?: string
}

function CustomCursor(props: Readonly<CustomCursorProps>) {
  const { fill, pointerEvents, height, points, className } = props

  if (!points || points.length === 0) {
    return null
  }

  const { x, y } = points[0]

  return (
    <>
      <Rectangle
        className={className}
        fill={fill}
        height={height}
        pointerEvents={pointerEvents}
        type="linear"
        width={24}
        // biome-ignore lint/style/noMagicNumbers: no check needed
        x={x - 12}
        y={y}
      />
      <Rectangle
        className="recharts-tooltip-inner-cursor"
        fill={fill}
        height={height}
        pointerEvents={pointerEvents}
        type="linear"
        width={1}
        x={x - 1}
        y={y}
      />
    </>
  )
}

export function CompleteOrdersChart() {
  const { month } = useSearch({
    from: '/app/dashboard/',
  })
  const { isLoading, summary } = useOrdersSummary(month as unknown as string)
  const dayFormmatter = useDateFormatter({
    month: 'short',
    day: 'numeric',
  })
  const monthFormatter = useDateFormatter({
    month: 'short',
    day: 'numeric',
  })

  const { chartData, totalOrders } = useMemo(() => {
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
      totalOrders: completeOrders.length,
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
      <Card className="@container/card col-span-4">
        <CardHeader>
          <CardTitle>Pedidos completados</CardTitle>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartNoAxesCombinedIcon />
              </EmptyMedia>
              <EmptyTitle>No hay pedidos completados</EmptyTitle>
              <EmptyDescription>
                No has completado ningún pedido aún.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card col-span-4">
      <CardHeader>
        <CardTitle>Pedidos completados</CardTitle>
        <CardDescription>
          Se han completado {totalOrders} pedidos
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          className="aspect-auto h-[250px] w-full"
          config={chartConfig}
        >
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{ left: -12, right: 12, top: 12 }}
          >
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="2 2"
              vertical={false}
            />
            <XAxis
              dataKey="createdAt"
              stroke="var(--border)"
              tickFormatter={(value) => dayFormmatter.format(new Date(value))}
              tickLine={false}
              tickMargin={12}
            />
            <YAxis
              axisLine={false}
              interval="preserveStartEnd"
              tickLine={false}
            />

            <ChartTooltip
              content={
                <CustomTooltipContent
                  colorMap={{
                    count: 'var(--chart-1)',
                  }}
                  dataKeys={['count']}
                  labelFormatter={(label) =>
                    monthFormatter.format(new Date(label))
                  }
                  labelMap={{
                    count: 'Ordenes',
                  }}
                  valueFormatter={(value) => `${value.toLocaleString()}`}
                />
              }
              cursor={<CustomCursor fill="var(--chart-1)" />}
            />

            <Area
              activeDot={{
                r: 5,
                fill: 'var(--chart-1)',
                stroke: 'var(--background)',
                strokeWidth: 2,
              }}
              dataKey="count"
              fill="var(--chart-1)"
              fillOpacity={0.1}
              stroke="var(--chart-1)"
              type="natural"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
