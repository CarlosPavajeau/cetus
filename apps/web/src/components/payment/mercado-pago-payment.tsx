import { useMutation } from '@tanstack/react-query'
import { BanknoteIcon } from 'lucide-react'
import { createOrderPayment, type Order } from '@/api/orders'
import { SubmitButton } from '../submit-button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../ui/empty'

type Props = {
  order: Order
}

export function MercadoPagoPayment({ order }: Props) {
  const { mutate, isPending } = useMutation({
    mutationKey: ['orders', 'payment', 'create'],
    mutationFn: createOrderPayment,
    onSuccess: (paymentUrl) => {
      window.location.href = paymentUrl
    },
  })

  const handlePayment = () => {
    mutate(order.id)
  }

  return (
    <Empty className="p-0 md:p-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BanknoteIcon />
        </EmptyMedia>
        <EmptyTitle>Mercado Pago</EmptyTitle>
        <EmptyDescription>
          Realiza el pago de tu pedido a través de la plataforma Mercado Pago.
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent>
        <SubmitButton
          disabled={isPending}
          isSubmitting={isPending}
          onClick={handlePayment}
          type="button"
        >
          Ir a Mercado Pago
        </SubmitButton>
      </EmptyContent>
    </Empty>
  )
}
