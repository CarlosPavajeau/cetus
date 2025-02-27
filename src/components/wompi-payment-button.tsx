import type { Order } from '@/api/orders'
import { valueToCents } from '@/shared/currency'
import { useGenerateIntegritySignature } from '@/shared/wompi'
import { ArrowRightIcon } from 'lucide-react'
import { Button } from './ui/button'

type Props = {
  order: Order
}

export const WonpiPaymentButton = ({ order }: Props) => {
  const amount = valueToCents(order.total)
  const reference = order.id
  const publicKey = import.meta.env.PUBLIC_WOMPI_KEY
  const integritySecret = import.meta.env.PUBLIC_WOMPI_INTEGRITY_SECRET

  const { isLoading, signature } = useGenerateIntegritySignature(
    reference,
    amount,
    integritySecret,
  )

  const redirect = window.location.origin + `/orders/${order.id}/confirmation`
  return (
    <form action="https://checkout.wompi.co/p/" method="GET">
      {/* Required fields */}
      <input type="hidden" name="public-key" value={publicKey} />
      <input type="hidden" name="currency" value="COP" />
      <input type="hidden" name="amount-in-cents" value={amount} />
      <input type="hidden" name="reference" value={reference} />

      <input type="hidden" name="signature:integrity" value={signature} />

      {/* Optionals */}
      <input type="hidden" name="redirect-url" value={redirect} />
      <input
        type="hidden"
        name="customer-data:email"
        value={order.customer.email}
      />
      <input
        type="hidden"
        name="customer-data:full-name"
        value={order.customer.name}
      />
      <input
        type="hidden"
        name="customer-data:phone-number"
        value={order.customer.phone}
      />

      <input
        type="hidden"
        name="shipping-address:address-line-1"
        value={order.address}
      />
      <input type="hidden" name="shipping-address:country" value="CO" />
      <input
        type="hidden"
        name="shipping-address:phone-number"
        value={order.customer.phone}
      />
      <input type="hidden" name="shipping-address:city" value="Valledupar" />
      <input type="hidden" name="shipping-address:region" value="Cesar" />

      <Button
        type="submit"
        size="lg"
        className="group w-full"
        disabled={isLoading}
      >
        Ir a pagar
        <ArrowRightIcon
          className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
          size={16}
          aria-hidden="true"
        />
      </Button>
    </form>
  )
}
