import { useQuery } from '@tanstack/react-query'
import { reportQueries } from '../queries'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { Badge } from '@cetus/web/components/ui/badge'
import { Progress } from '@cetus/web/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cetus/web/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@cetus/web/components/ui/tabs'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { cn } from '@cetus/web/shared/utils'
import { PackageIcon } from 'lucide-react'
import { useNumberFormatter } from 'react-aria'
import { useMemo, useState } from 'react'

type SortKey = 'profit' | 'revenue' | 'unitsSold' | 'marginPercentage'

const RANK_CLASSES = [
  'bg-amber-400 text-amber-950',
  'bg-zinc-300 text-zinc-700',
  'bg-orange-400 text-orange-950',
]

function getRankClass(index: number) {
  return RANK_CLASSES[index] ?? 'bg-muted text-muted-foreground'
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'profit', label: 'Ganancia' },
  { key: 'revenue', label: 'Ventas' },
  { key: 'unitsSold', label: 'Unidades' },
  { key: 'marginPercentage', label: 'Margen' },
]

export function ProductsRanking() {
  const currencyFormat = useNumberFormatter({
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })

  const percentageFormat = useNumberFormatter({
    style: 'percent',
    signDisplay: 'always',
    maximumFractionDigits: 1,
  })

  const [sortKey, setSortKey] = useState<SortKey>('profit')

  const { data, isLoading } = useQuery(
    reportQueries.productsProfitabilityRanking(),
  )

  const sorted = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => b[sortKey] - a[sortKey])
  }, [data, sortKey])

  if (isLoading) return <DefaultLoader />

  const activeSortLabel =
    SORT_OPTIONS.find((o) => o.key === sortKey)?.label.toLowerCase() ?? ''

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-semibold text-xl tracking-tight">
            Ranking de productos
          </h1>
          <p className="text-muted-foreground text-sm">
            {data?.length ?? 0} productos · ordenado por {activeSortLabel}
          </p>
        </div>

        <Tabs value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <TabsList>
            {SORT_OPTIONS.map(({ key, label }) => (
              <TabsTrigger key={key} value={key}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Unidades</TableHead>
              <TableHead className="text-right">Ventas</TableHead>
              <TableHead className="text-right">Costos</TableHead>
              <TableHead className="text-right">Ganancia</TableHead>
              <TableHead className="text-center">Margen</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sorted.map((product, i) => {
              const isProfit = product.profit >= 0
              const isPositiveMargin = product.marginPercentage >= 0
              const absMarginWidth = Math.min(
                Math.abs(product.marginPercentage) * 100,
                100,
              )

              return (
                <TableRow key={product.productId}>
                  <TableCell>
                    <Badge
                      className={cn(
                        'size-6 justify-center rounded-full px-0',
                        getRankClass(i),
                      )}
                    >
                      {i + 1}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">
                        {product.product}
                      </span>
                      {product.isStartProduct ? (
                        <Badge
                          title="Producto estrella"
                          className="size-4 justify-center rounded-full border-0 bg-amber-100 px-0 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                        >
                          ★
                        </Badge>
                      ) : null}
                      {product.isProblematic ? (
                        <Badge
                          title="Producto problemático"
                          className="size-4 justify-center rounded-full border-0 bg-rose-100 px-0 font-bold text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                        >
                          !
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {product.category}
                    </span>
                  </TableCell>

                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {product.unitsSold.toLocaleString('es-CO')}
                  </TableCell>

                  <TableCell className="text-right tabular-nums">
                    {currencyFormat.format(product.revenue)}
                  </TableCell>

                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {currencyFormat.format(product.costs)}
                  </TableCell>

                  <TableCell
                    className={cn(
                      'text-right font-semibold tabular-nums',
                      isProfit
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {currencyFormat.format(product.profit)}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={cn(
                          'text-xs font-semibold tabular-nums',
                          isPositiveMargin
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400',
                        )}
                      >
                        {percentageFormat.format(product.marginPercentage)}
                      </span>
                      <Progress
                        value={absMarginWidth}
                        className={cn(
                          'w-16',
                          isPositiveMargin
                            ? '[&_[data-slot=progress-indicator]]:bg-emerald-500'
                            : '[&_[data-slot=progress-indicator]]:bg-rose-500',
                        )}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}

            {!data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <PackageIcon />
                      </EmptyMedia>
                      <EmptyTitle>Sin datos disponibles</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {data && data.length > 0 ? (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Badge className="size-4 justify-center rounded-full border-0 bg-amber-100 px-0 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              ★
            </Badge>
            Producto estrella
          </span>
          <span className="flex items-center gap-1.5">
            <Badge className="size-4 justify-center rounded-full border-0 bg-rose-100 px-0 font-bold text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
              !
            </Badge>
            Producto problemático
          </span>
        </div>
      ) : null}
    </div>
  )
}
