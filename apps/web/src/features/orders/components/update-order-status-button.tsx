import { api } from '@cetus/api-client'
import type { Order, OrderStatus } from '@cetus/api-client/types/orders'
import { orderStatusLabels } from '@cetus/shared/constants/order'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@cetus/ui/dropdown-menu'
import { Button } from '@cetus/web/components/ui/button'
import { Spinner } from '@cetus/web/components/ui/spinner'
import {
  CancelCircleIcon,
  CreditCardPosIcon,
  DeliveryReturn01Icon,
  PackageDeliveredIcon,
  PackageIcon,
  PackageProcessIcon,
  ShippingTruck01Icon,
  Store01Icon,
  UnavailableIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation } from '@tanstack/react-query'
import { ChevronDownIcon } from 'lucide-react'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CancelOrderDialog } from './cancel-order-dialog'

type Props = {
  order: Order
}

const nextAllowedOrderStatuses: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['payment_confirmed', 'canceled'],
  payment_confirmed: ['processing', 'canceled'],
  processing: ['ready_for_pickup', 'shipped', 'canceled'],
  shipped: ['delivered', 'failed_delivery'],
  ready_for_pickup: ['delivered', 'canceled'],
  delivered: [],
  failed_delivery: ['shipped', 'returned'],
  canceled: [],
  returned: [],
}

const statusIcons = {
  pending_payment: <HugeiconsIcon icon={PackageProcessIcon} />,
  payment_confirmed: <HugeiconsIcon icon={CreditCardPosIcon} />,
  processing: <HugeiconsIcon icon={PackageProcessIcon} />,
  ready_for_pickup: <HugeiconsIcon icon={Store01Icon} />,
  shipped: <HugeiconsIcon icon={ShippingTruck01Icon} />,
  delivered: <HugeiconsIcon icon={PackageDeliveredIcon} />,
  failed_delivery: <HugeiconsIcon icon={CancelCircleIcon} />,
  canceled: <HugeiconsIcon icon={UnavailableIcon} />,
  returned: <HugeiconsIcon icon={DeliveryReturn01Icon} />,
} satisfies Record<OrderStatus, ReactNode>

export function UpdateOrderStatusButton({ order }: Readonly<Props>) {
  const nextStatuses = useMemo(
    () => nextAllowedOrderStatuses[order.status],
    [order],
  )

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const updateStatusMutation = useMutation({
    mutationKey: ['orders', 'status', order.id],
    mutationFn: api.orders.updateStatus,
    onSuccess: (_, __, ___, context) => {
      toast.success('Estado del pedido actualizado')
      context.client.invalidateQueries({
        queryKey: ['orders'],
      })
    },
    onError: () => {
      toast.error('No se pudo actualizar el estado del pedido.')
    },
  })

  const handleStatusChange = useCallback(
    (status: OrderStatus) => {
      updateStatusMutation.mutate({
        orderId: order.id,
        newStatus: status,
      })
    },
    [updateStatusMutation, order],
  )

  if (nextStatuses.length === 0) {
    return null
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button type="button">
            {updateStatusMutation.isPending ? (
              <Spinner aria-hidden="true" />
            ) : (
              <HugeiconsIcon icon={PackageIcon} />
            )}
            Cambiar estado
            <ChevronDownIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-60">
          {nextStatuses.map((status) => {
            const StatusIcon = statusIcons[status]

            if (status === 'canceled') {
              return (
                <DropdownMenuItem
                  className="gap-2"
                  disabled={updateStatusMutation.isPending}
                  key={status}
                  onSelect={() => setCancelDialogOpen(true)}
                  variant="destructive"
                >
                  {StatusIcon}
                  {orderStatusLabels[status]}
                </DropdownMenuItem>
              )
            }

            return (
              <DropdownMenuItem
                className="gap-2"
                disabled={updateStatusMutation.isPending}
                key={status}
                onSelect={() => handleStatusChange(status)}
              >
                {StatusIcon}
                {orderStatusLabels[status]}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelOrderDialog
        onOpenChange={setCancelDialogOpen}
        open={cancelDialogOpen}
        orderId={order.id}
      />
    </>
  )
}
