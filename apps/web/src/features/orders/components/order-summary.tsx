import type { Order } from '@cetus/api-client/types/orders'
import { OrderCustomerCard } from '@cetus/web/features/orders/components/order-customer.card'
import { OrderItemsList } from '@cetus/web/features/orders/components/order-items-list'
import { OrderTimeline } from '@cetus/web/features/orders/components/order-timeline'
import { PaymentSummary } from '@cetus/web/features/orders/components/payment-summary'

type Props = {
  order: Order
  isAdmin?: boolean
}

export function OrderSummary({ order, isAdmin = false }: Readonly<Props>) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <OrderItemsList order={order} />
      </div>
      <div className="space-y-4">
        <OrderCustomerCard address={order.address} customer={order.customer} />

        {isAdmin && <PaymentSummary order={order} />}

        <OrderTimeline order={order} />
      </div>
    </div>
  )
}
