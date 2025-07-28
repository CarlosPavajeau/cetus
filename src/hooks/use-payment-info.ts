import { GetPayment } from '@/server/mercadopago'
import { useQuery } from '@tanstack/react-query'

export function usePaymentInfo(paymentId: number) {
  const { data, isLoading } = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () =>
      GetPayment({
        data: { payment_id: paymentId },
      }),
  })

  return {
    payment: data,
    isLoading,
  }
}
