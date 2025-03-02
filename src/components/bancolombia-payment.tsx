import type { Order } from '@/api/orders'
import { LandmarkIcon } from 'lucide-react'
import { BasePaymentForm } from './base-payment-form'

type Props = {
  order: Order
}

export const BancolombiaPayment = ({ order }: Props) => {
  return (
    <BasePaymentForm order={order} buttonText="Pagar con Bancolombia">
      <div className="flex flex-col items-center gap-4 py-4">
        <LandmarkIcon size={48} className="text-muted-foreground" />
        <p className="text-center text-muted-foreground">
          Serás redirigido a Bancolombia para completar tu pago de forma segura.
        </p>
      </div>
    </BasePaymentForm>
  )
}
