import { fetchOrder, fetchOrderInsights } from '@/api/orders'
import { useQuery } from '@tanstack/react-query'

export function useOrderInsights() {
  const { data, isLoading } = useQuery({
    queryKey: ['order-insights'],
    queryFn: fetchOrderInsights,
  })

  return {
    insights: data,
    isLoading,
  }
}

export function useOrder(id: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', id],
    queryFn: () => fetchOrder(id),
  })

  return {
    order: data,
    isLoading,
    error,
  }
}
