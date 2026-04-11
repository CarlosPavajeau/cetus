import type { ChannelMetrics } from '@cetus/api-client/types/reports'
import { getSaleChannelLabel } from '@cetus/shared/constants/order'
import { Card, CardContent, CardHeader, CardTitle } from '@cetus/ui/card'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { Currency } from '@cetus/web/components/currency'
import { cn } from '@cetus/web/shared/utils'
import {
  BarChart2Icon,
  GlobeIcon,
  MessageCircleIcon,
  MessageSquareIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
} from 'lucide-react'
import { useMemo } from 'react'
import { useNumberFormatter } from 'react-aria'

const channelFills: Record<string, string> = {
  ecommerce: 'oklch(0.70 0.17 250)',
  whatsapp: 'oklch(0.72 0.19 150)',
  messenger: 'oklch(0.80 0.15 85)',
  in_store: 'oklch(0.64 0.21 25)',
  other: 'oklch(0.55 0.02 260)',
}

function ChannelIcon({
  channel,
  className,
}: {
  channel: string
  className?: string
}) {
  switch (channel) {
    case 'ecommerce':
      return <GlobeIcon className={className} />
    case 'whatsapp':
      return <MessageCircleIcon className={className} />
    case 'messenger':
      return <MessageSquareIcon className={className} />
    case 'in_store':
      return <ShoppingBagIcon className={className} />
    default:
      return <ShoppingCartIcon className={className} />
  }
}

function getChannelLabel(channel: string) {
  if (channel === 'ecommerce') return 'E-commerce'
  return getSaleChannelLabel(channel)
}

type Props = {
  byChannel: ChannelMetrics[]
}

export function ChannelRevenueChart({ byChannel }: Readonly<Props>) {
  const currencyFormat = useNumberFormatter({
    style: 'currency',
    currency: 'COP',
    notation: 'compact',
  })

  const totalRevenue = useMemo(
    () => byChannel.reduce((sum, ch) => sum + ch.revenue, 0),
    [byChannel],
  )

  const channelData = useMemo(
    () =>
      byChannel.map((ch) => ({
        channel: ch.channel,
        label: getChannelLabel(ch.channel),
        revenue: ch.revenue,
        orderCount: ch.orderCount,
        percentage: ch.percentage,
        fill: channelFills[ch.channel] ?? 'oklch(0.55 0.02 260)',
      })),
    [byChannel],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas por canal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {channelData.length > 0 ? (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total del día
              </p>
              <p className="mt-1 font-bold font-mono text-2xl tabular-nums">
                <Currency currency="COP" value={totalRevenue} />
              </p>
            </div>

            <div className="flex h-2 w-full overflow-hidden rounded-full">
              {channelData.map((item) => (
                <div
                  key={item.channel}
                  className="h-full"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.fill,
                  }}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {channelData.map((item) => (
                <div key={item.channel} className="flex items-center gap-1.5">
                  <div
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col">
              {channelData.map((item, i) => (
                <div
                  key={item.channel}
                  className={cn(
                    'flex items-center gap-3 py-2.5',
                    i > 0 && 'border-t',
                  )}
                >
                  <ChannelIcon
                    channel={item.channel}
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="flex-1 text-sm">{item.label}</span>
                  <span className="font-medium font-mono text-sm tabular-nums">
                    {currencyFormat.format(item.revenue)}
                  </span>
                  <span className="w-16 text-right text-xs text-muted-foreground">
                    {item.orderCount} ventas
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart2Icon />
              </EmptyMedia>
              <EmptyTitle>Sin datos de canales</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  )
}
