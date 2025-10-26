import { useQuery } from '@tanstack/react-query'
import { fetchOrderPayment } from '@/api/orders'

export function useOrderPaymentInfo(orderId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['order', 'payment', orderId],
    queryFn: () => fetchOrderPayment(orderId),
  })

  return {
    payment: data,
    isLoading,
  }
}
