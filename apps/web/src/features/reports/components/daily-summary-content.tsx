import type { DailySummaryResponse } from '@cetus/api-client/types/reports'
import { getImageUrl } from '@cetus/shared/utils/image'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@cetus/web/components/ui/item'
import { ChannelRevenueChart } from '@cetus/web/features/reports/components/channel-revenue-chart'
import { OrderStatusChart } from '@cetus/web/features/reports/components/order-status-chart'
import { PaymentStatusCard } from '@cetus/web/features/reports/components/payment-status-card'
import { StatsCard } from '@cetus/web/features/reports/components/stats-card'
import { Image } from '@unpic/react'
import { useCallback } from 'react'
import { useNumberFormatter } from 'react-aria'

type Props = {
  data: DailySummaryResponse
}

export function DailySummaryContent({ data }: Readonly<Props>) {
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

  const formatCurrency = useCallback(
    (value: number) => currencyFormat.format(value),
    [currencyFormat],
  )
  const formatNumber = useCallback(
    (value: number) => numberFormat.format(value),
    [numberFormat],
  )

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          format={formatNumber}
          title="Ventas del día"
          value={data.orders.total}
        />
        <StatsCard
          format={formatCurrency}
          title="Ingresos confirmados"
          value={data.revenue.confirmed}
        />
        <StatsCard
          format={formatCurrency}
          title="Ingresos pendientes"
          value={data.revenue.pending}
        />
        <StatsCard
          format={formatNumber}
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
              {data.orders.total > 0
                ? percentageFormat.format(
                    data.orders.confirmed / data.orders.total,
                  )
                : '—'}
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
                src={getImageUrl(data.topProduct.imageUrl ?? 'placeholder.svg')}
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
        <OrderStatusChart orders={data.orders} />
        <ChannelRevenueChart byChannel={data.byChannel} />
        <PaymentStatusCard byPaymentStatus={data.byPaymentStatus} />
      </div>
    </>
  )
}
