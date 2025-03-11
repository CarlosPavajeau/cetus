import { fetchOrderInsights } from '@/api/orders'
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
