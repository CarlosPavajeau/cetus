import type { SimpleOrder } from '@cetus/api-client/types/orders'
import { OrderCard } from '@cetus/web/features/orders/components/order-card'
import { memo } from 'react'

export const OrdersList = memo(({ orders }: { orders: SimpleOrder[] }) => (
  <div className="space-y-3 pb-6">
    {orders.map((order) => (
      <OrderCard key={order.id} order={order} />
    ))}
  </div>
))
