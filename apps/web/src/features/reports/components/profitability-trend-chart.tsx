import type { MonthlyTrend } from '@cetus/api-client/types/reports'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cetus/ui/card'
import { type ChartConfig, ChartContainer, ChartTooltip } from '@cetus/ui/chart'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { CustomTooltipContent } from '@cetus/web/components/charts-extra'
import { ChartNoAxesCombinedIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const

const chartConfig = {
  totalSales: {
    label: 'Ventas',
    color: 'var(--chart-1)',
  },
  grossProfit: {
    label: 'Ganancia bruta',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
})

const compactCopFormatter = new Intl.NumberFormat('es-CO', {
  notation: 'compact',
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
})

type Props = {
  trend: MonthlyTrend[]
}

export function ProfitabilityTrendChart({ trend }: Readonly<Props>) {
  const chartData = useMemo(
    () =>
      trend.map((item) => ({
        label: `${MONTH_LABELS[item.month - 1] ?? '?'} ${item.year}`,
        totalSales: item.totalSales,
        grossProfit: item.grossProfit,
      })),
    [trend],
  )

  if (chartData.length === 0) {
    return (
      <Card className="@container/card">
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartNoAxesCombinedIcon />
              </EmptyMedia>
              <EmptyTitle>Sin datos de tendencia</EmptyTitle>
              <EmptyDescription>
                No hay datos disponibles para el período seleccionado.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Ventas vs. ganancia bruta</CardTitle>
        <CardDescription>
          Comparativo por mes en el período seleccionado
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          className="aspect-auto h-62.5 w-full"
          config={chartConfig}
        >
          <BarChart
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
              dataKey="label"
              stroke="var(--border)"
              tickLine={false}
              tickMargin={12}
            />
            <YAxis
              axisLine={false}
              tickFormatter={(value) =>
                compactCopFormatter.format(value as number)
              }
              tickLine={false}
              width={72}
            />
            <ChartTooltip
              content={
                <CustomTooltipContent
                  colorMap={{
                    totalSales: 'var(--chart-1)',
                    grossProfit: 'var(--chart-2)',
                  }}
                  dataKeys={['totalSales', 'grossProfit']}
                  labelMap={{
                    totalSales: 'Ventas',
                    grossProfit: 'Ganancia bruta',
                  }}
                  valueFormatter={(value) => copFormatter.format(value)}
                />
              }
            />
            <Bar
              dataKey="totalSales"
              fill="var(--chart-1)"
              fillOpacity={0.9}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="grossProfit"
              fill="var(--chart-2)"
              fillOpacity={0.9}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
