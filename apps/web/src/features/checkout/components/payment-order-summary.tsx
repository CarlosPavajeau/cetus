import type { Order } from '@cetus/api-client/types/orders'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@cetus/ui/collapsible'
import { Separator } from '@cetus/ui/separator'
import { Currency } from '@cetus/web/components/currency'
import { RedeemCoupon } from '@cetus/web/features/coupons/components/redeem-coupon'
import { OrderItemView } from '@cetus/web/features/orders/components/order-item-view'
import { ArrowDown01Icon, PackageIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'

type PaymentOrderSummaryProps = {
  order: Order
}

export function PaymentOrderSummary({ order }: PaymentOrderSummaryProps) {
  return (
    <div className="space-y-3">
      <div className="divide-y">
        {order.items.map((item) => (
          <OrderItemView item={item} key={item.id} />
        ))}
      </div>

      <Separator />

      <RedeemCoupon order={order} />

      <Separator />

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">
            <Currency currency="COP" value={order.subtotal} />
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Envío</span>
          <span className="tabular-nums">
            <Currency currency="COP" value={order.deliveryFee ?? 0} />
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Descuento</span>
          <span className="tabular-nums">
            <Currency currency="COP" value={order.discount ?? 0} />
          </span>
        </div>
      </div>

      <Separator />

      <div className="flex justify-between font-bold text-base">
        <span>Total</span>
        <span className="tabular-nums">
          <Currency currency="COP" value={order.total} />
        </span>
      </div>

      <div className="rounded-lg bg-muted/50 px-3 py-2.5">
        <p className="text-muted-foreground text-xs leading-relaxed">
          El costo del envío se cancela al momento de la entrega de los
          productos.
        </p>
      </div>
    </div>
  )
}

export function MobilePaymentOrderSummary({ order }: PaymentOrderSummaryProps) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <div className="rounded-md border bg-card">
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center justify-between p-4 text-left transition-colors active:bg-accent"
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <HugeiconsIcon
                  className="size-4 text-primary"
                  icon={PackageIcon}
                />
              </div>
              <div>
                <span className="font-medium text-sm">
                  Resumen de la orden #{order.orderNumber}
                </span>
                <p className="text-muted-foreground text-xs">
                  {order.items.length}{' '}
                  {order.items.length === 1 ? 'producto' : 'productos'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tabular-nums">
                <Currency currency="COP" value={order.total} />
              </span>
              <HugeiconsIcon
                className={`size-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                icon={ArrowDown01Icon}
              />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden">
          <div className="border-t px-4 pt-3 pb-4">
            <PaymentOrderSummary order={order} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
