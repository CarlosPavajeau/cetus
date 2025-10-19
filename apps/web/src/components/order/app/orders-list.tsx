import { memo } from 'react'
import type { SimpleOrder } from '@/api/orders'
import { OrderCard } from '@/components/order/order-card'

export const OrdersList = memo(({ orders }: { orders: SimpleOrder[] }) => (
  <div className="space-y-3 pb-6">
    {orders.map((order) => (
      <OrderCard key={order.id} order={order} />
    ))}
  </div>
))
