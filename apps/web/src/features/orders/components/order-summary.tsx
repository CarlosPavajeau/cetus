import type { Order } from '@cetus/api-client/types/orders'
import { OrderCustomerCard } from '@cetus/web/features/orders/components/order-customer.card'
import { OrderItemsList } from '@cetus/web/features/orders/components/order-items-list'
import { PaymentSummary } from '@cetus/web/features/orders/components/payment-summary'

type Props = {
  order: Order
}

export function OrderSummary({ order }: Readonly<Props>) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <OrderCustomerCard
            address={order.address}
            customer={order.customer}
          />

          <PaymentSummary order={order} />
        </div>

        <OrderItemsList order={order} />
      </div>
    </div>
  )
}
