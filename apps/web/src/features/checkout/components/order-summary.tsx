import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@cetus/ui/collapsible'
import { Separator } from '@cetus/ui/separator'
import { Currency } from '@cetus/web/components/currency'
import { OrderItemView } from '@cetus/web/features/orders/components/order-item-view'
import type { CartItem } from '@cetus/web/store/cart'
import { ArrowDown01Icon, PackageIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { memo, useState } from 'react'

export type OrderSummaryProps = {
  items: CartItem[]
  total: number
  deliveryFee: number | undefined
  isLoadingDeliveryFee: boolean
}

function DeliveryFeeDisplay({
  isLoading,
  deliveryFee,
}: {
  isLoading: boolean
  deliveryFee: number | undefined
}) {
  if (isLoading) {
    return (
      <span className="animate-pulse text-muted-foreground">Calculando...</span>
    )
  }

  if (deliveryFee !== undefined) {
    return <Currency currency="COP" value={deliveryFee} />
  }

  return <span className="text-muted-foreground italic">Selecciona ciudad</span>
}

export const OrderSummary = memo(function OrderSummary({
  items,
  total,
  deliveryFee,
  isLoadingDeliveryFee,
}: OrderSummaryProps) {
  return (
    <div className="space-y-3">
      <div className="divide-y">
        {items.map((item) => (
          <OrderItemView
            item={{
              id: item.product.productId,
              productName: item.product.name,
              imageUrl: item.product.imageUrl,
              optionValues: item.product.optionValues,
              price: item.product.price,
              quantity: item.quantity,
            }}
            key={item.product.variantId}
          />
        ))}
      </div>

      <Separator />

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">
            <Currency currency="COP" value={total} />
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Envío</span>
          <span className="tabular-nums">
            <DeliveryFeeDisplay
              deliveryFee={deliveryFee}
              isLoading={isLoadingDeliveryFee}
            />
          </span>
        </div>
      </div>

      <Separator />

      <div className="flex justify-between font-bold text-base">
        <span>Total</span>
        <span className="tabular-nums">
          <Currency currency="COP" value={total + (deliveryFee ?? 0)} />
        </span>
      </div>
    </div>
  )
})

export function MobileOrderSummary(props: OrderSummaryProps) {
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
                <span className="font-medium text-sm">Resumen del pedido</span>
                <p className="text-muted-foreground text-xs">
                  {props.items.length}{' '}
                  {props.items.length === 1 ? 'producto' : 'productos'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tabular-nums">
                <Currency
                  currency="COP"
                  value={props.total + (props.deliveryFee ?? 0)}
                />
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
            <OrderSummary {...props} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
