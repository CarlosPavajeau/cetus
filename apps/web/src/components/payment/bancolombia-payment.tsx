import type { Order } from '@/api/orders'
import { BancolombiaLogo } from '@/components/icons'
import { BasePaymentForm } from '@/components/payment/base-payment-form'

type Props = {
  order: Order
}

export const BancolombiaPayment = ({ order }: Props) => (
  <BasePaymentForm buttonText="Pagar con Bancolombia" order={order}>
    <div className="flex flex-col items-center gap-4 py-4">
      <BancolombiaLogo className="size-12" />
      <p className="text-center text-muted-foreground">
        Serás redirigido a Bancolombia para completar tu pago de forma segura.
      </p>
    </div>
  </BasePaymentForm>
)
