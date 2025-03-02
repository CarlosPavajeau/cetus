import type { Order } from '@/api/orders'
import { BasePaymentForm } from './base-payment-form'
import { BancolombiaLogo } from './icons'

type Props = {
  order: Order
}

export const BancolombiaPayment = ({ order }: Props) => {
  return (
    <BasePaymentForm order={order} buttonText="Pagar con Bancolombia">
      <div className="flex flex-col items-center gap-4 py-4">
        <BancolombiaLogo className="size-12" />
        <p className="text-center text-muted-foreground">
          Serás redirigido a Bancolombia para completar tu pago de forma segura.
        </p>
      </div>
    </BasePaymentForm>
  )
}
