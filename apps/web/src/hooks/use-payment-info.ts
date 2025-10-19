import { useQuery } from '@tanstack/react-query'
import { getMercadoPagoPayment } from '@/functions/mercadopago'

export function usePaymentInfo(paymentId: number) {
  const { data, isLoading } = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () =>
      getMercadoPagoPayment({
        data: { payment_id: paymentId },
      }),
    enabled: paymentId > 0,
  })

  return {
    payment: data,
    isLoading,
  }
}
