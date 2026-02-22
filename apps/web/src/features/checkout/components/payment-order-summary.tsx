import type { Order } from '@cetus/api-client/types/orders'
import { Separator } from '@cetus/ui/separator'
import { Currency } from '@cetus/web/components/currency'
import { SecurityCheckIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

type PaymentOrderSummaryProps = {
  order: Order
}

export function PaymentOrderSummary({ order }: PaymentOrderSummaryProps) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <p className="mb-4 font-mono text-muted-foreground text-xs uppercase tracking-widest">
        Resumen del pedido
      </p>

      <div className="flex flex-col gap-1.5 text-sm">
        {order.items.map((item) => (
          <div className="flex items-start justify-between gap-2" key={item.id}>
            <span className="truncate text-muted-foreground">
              {item.productName}
              {item.quantity > 1 && (
                <span className="ml-1 font-mono text-xs">×{item.quantity}</span>
              )}
            </span>
            <span className="shrink-0 font-medium tabular-nums">
              <Currency currency="COP" value={item.price * item.quantity} />
            </span>
          </div>
        ))}
      </div>

      <Separator className="my-4 h-px" />

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium tabular-nums">
            <Currency currency="COP" value={order.subtotal} />
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Descuento</span>
          <span className="font-medium tabular-nums">
            <Currency currency="COP" value={order.discount} />
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Envió</span>
          <span className="tabular-nums">
            {order.deliveryFee === 0 ? (
              <span className="text-emerald-500">Envió gratis</span>
            ) : (
              <Currency currency="COP" value={order.deliveryFee ?? 0} />
            )}
          </span>
        </div>
        <div className="my-1 h-px bg-border" />
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span className="tabular-nums">
            <Currency
              currency="COP"
              value={order.total + (order.deliveryFee ?? 0)}
            />
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <HugeiconsIcon
          className="size-3 shrink-0 text-muted-foreground"
          data-icon="inline-start"
          icon={SecurityCheckIcon}
        />
        <p className="font-mono text-[10px] text-muted-foreground">
          Protegido con cifrado SSL
        </p>
      </div>
    </div>
  )
}
