import { fetchOrders } from '@/api/orders'
import { useQuery } from '@tanstack/react-query'

export const useOrders = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
  })

  return {
    orders: data,
    isLoading,
    error,
  }
}
