import { fetchOrder } from '@/api/orders'
import { useQuery } from '@tanstack/react-query'

export const useOrder = (id: string) => {
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
