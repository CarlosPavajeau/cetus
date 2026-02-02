import type { Order, OrderStatus } from '@cetus/api-client/types/orders'
import { orderStatusLabels } from '@cetus/shared/constants/order'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@cetus/ui/dropdown-menu'
import { Button } from '@cetus/web/components/ui/button'
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
import { ChevronDownIcon } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { CancelOrderDialog } from './cancel-order-dialog'
import { UpdateOrderStatusDialog } from './update-order-status-dialog'

type Props = {
  order: Order
}

const nextAllowedOrderStatuses: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['payment_confirmed', 'canceled'],
  payment_confirmed: ['processing', 'canceled'],
  processing: ['ready_for_pickup', 'shipped', 'canceled'],
  shipped: ['delivered', 'failed_delivery'],
  ready_for_pickup: ['delivered', 'canceled'],
  delivered: ['returned'],
  failed_delivery: ['shipped', 'returned', 'canceled'],
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
  const [isUpdateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null)

  const handleSelectStatus = (status: OrderStatus) => {
    if (status === 'canceled') {
      setCancelDialogOpen(true)
      return
    }
    setSelectedStatus(status)
    setUpdateDialogOpen(true)
  }

  if (nextStatuses.length === 0) {
    return null
  }

  const isAnyDialogOpen = cancelDialogOpen || isUpdateDialogOpen

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button disabled={isAnyDialogOpen} type="button">
            <HugeiconsIcon icon={PackageIcon} />
            Cambiar estado
            <ChevronDownIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-60">
          {nextStatuses.map((status) => (
            <DropdownMenuItem
              className="gap-2"
              disabled={isAnyDialogOpen}
              key={status}
              onSelect={() => handleSelectStatus(status)}
              variant={status === 'canceled' ? 'destructive' : 'default'}
            >
              {statusIcons[status]}
              {orderStatusLabels[status]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelOrderDialog
        onOpenChange={setCancelDialogOpen}
        open={cancelDialogOpen}
        orderId={order.id}
      />

      <UpdateOrderStatusDialog
        onOpenChange={setUpdateDialogOpen}
        open={isUpdateDialogOpen}
        orderId={order.id}
        status={selectedStatus}
      />
    </>
  )
}
