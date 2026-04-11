import { env } from '@cetus/env/client'
import {
  getSaleChannelLabel,
  orderStatusColors,
  orderStatusLabels,
} from '@cetus/shared/constants/order'
import { Badge } from '@cetus/ui/badge'
import { Separator } from '@cetus/ui/separator'
import { Currency } from '@cetus/web/components/currency'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { ReturnButton } from '@cetus/web/components/return-button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@cetus/web/components/ui/tooltip'
import { OrderSummary } from '@cetus/web/features/orders/components/order-summary'
import { UpdateOrderStatusButton } from '@cetus/web/features/orders/components/update-order-status-button'
import { orderQueries } from '@cetus/web/features/orders/queries'
import { OrderPaymentLinkDialog } from '@cetus/web/features/payment-links/components/order-payment-link-dialog'
import {
  useClientMethod,
  useHub,
  useHubGroup,
} from '@cetus/web/hooks/realtime/use-hub'
import {
  Calendar03Icon,
  MapPinpoint01Icon,
  PromotionIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { AlertCircleIcon } from 'lucide-react'

const REALTIME_URL = `${env.VITE_API_URL}/realtime/orders`

function useRealtimeOrderUpdates(orderId: string) {
  const { connection } = useHub(REALTIME_URL)
  const queryClient = useQueryClient()

  useHubGroup(connection, 'JoinOrderGroup', orderId)

  useClientMethod(connection, 'ReceiveUpdatedOrder', () => {
    queryClient.invalidateQueries(orderQueries.detail(orderId))
  })
}

export const Route = createFileRoute('/_authed/app/orders/$id')({
  component: RouteComponent,
  pendingComponent: () => (
    <div className="p-4 sm:p-6 lg:p-8">
      <DefaultLoader />
    </div>
  ),
  loader: async ({ context: { queryClient }, params: { id } }) =>
    await queryClient.ensureQueryData(orderQueries.detail(id)),
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: order } = useSuspenseQuery(orderQueries.detail(id))

  useRealtimeOrderUpdates(id)

  if (!order) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="font-bold text-2xl tracking-tight">
          Pedido no encontrado
        </h1>
        <p className="text-muted-foreground text-sm">
          No se pudo encontrar el pedido solicitado.
        </p>
      </div>
    )
  }

  const statusColor = orderStatusColors[order.status]

  return (
    <div className="px-4 pb-6 sm:px-6 lg:px-8">
      <div className="sticky top-0 z-10 space-y-3 border-b bg-background/95 py-4 backdrop-blur-md">
        <ReturnButton />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading font-semibold text-2xl tracking-tight">
              Orden #{order.orderNumber}
            </h1>
            <Badge
              className="rounded-md border-transparent"
              style={{
                backgroundColor: statusColor.replace(')', ' / 0.15)'),
                color: statusColor,
              }}
            >
              {orderStatusLabels[order.status]}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <OrderPaymentLinkDialog order={order} />
            <UpdateOrderStatusButton order={order} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground text-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-default items-center gap-1.5">
                <HugeiconsIcon
                  className="size-3.5 shrink-0"
                  icon={Calendar03Icon}
                />
                <FormattedDate date={new Date(order.createdAt)} />
              </span>
            </TooltipTrigger>
            <TooltipContent>Fecha de creación</TooltipContent>
          </Tooltip>

          {order.city ? (
            <>
              <span aria-hidden className="text-border">·</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-default items-center gap-1.5">
                    <HugeiconsIcon
                      className="size-3.5 shrink-0"
                      icon={MapPinpoint01Icon}
                    />
                    {order.city}, {order.state}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Ciudad y departamento</TooltipContent>
              </Tooltip>
            </>
          ) : null}

          <span aria-hidden className="text-border">·</span>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-default items-center gap-1.5">
                <HugeiconsIcon
                  className="size-3.5 shrink-0"
                  icon={PromotionIcon}
                />
                {getSaleChannelLabel(order.channel)}
              </span>
            </TooltipTrigger>
            <TooltipContent>Canal de venta</TooltipContent>
          </Tooltip>

          <span aria-hidden className="text-border">·</span>

          <span className="font-medium text-foreground">
            <Currency currency="COP" value={order.total} />
          </span>
        </div>

        {order.status === 'canceled' && order.cancellationReason ? (
          <div className="flex w-full items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">
                Razón: {order.cancellationReason}
              </span>
              {order.cancelledAt ? (
                <span className="mt-0.5 text-xs opacity-90">
                  Cancelado el{' '}
                  <FormattedDate date={new Date(order.cancelledAt)} />
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <OrderSummary isAdmin order={order} />
      </div>
    </div>
  )
}
