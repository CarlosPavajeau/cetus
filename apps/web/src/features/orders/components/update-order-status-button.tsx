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
import { useMutation } from '@tanstack/react-query'
import {
  BanIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  CreditCardIcon,
  PackageIcon,
  PackageSearchIcon,
  RotateCcwIcon,
  StoreIcon,
  TruckIcon,
  XCircleIcon,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
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
  pending_payment: ClockIcon,
  payment_confirmed: CreditCardIcon,
  processing: PackageSearchIcon,
  ready_for_pickup: StoreIcon,
  shipped: TruckIcon,
  delivered: CheckCircleIcon,
  failed_delivery: XCircleIcon,
  canceled: BanIcon,
  returned: RotateCcwIcon,
} satisfies Record<OrderStatus, typeof ClockIcon>

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
          <Button size="sm" type="button">
            {updateStatusMutation.isPending ? (
              <Spinner aria-hidden="true" />
            ) : (
              <PackageIcon aria-hidden="true" />
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
                >
                  <StatusIcon className="size-4" />
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
                <StatusIcon className="size-4" />
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
