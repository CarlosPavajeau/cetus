import { useQuery } from '@tanstack/react-query'
import { fetchCustomer } from '@/api/customers'

export function useCustomer(id: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => fetchCustomer(id),
    retry: false,
    enabled: !!id,
  })

  return {
    customer: data,
    isLoading,
    error,
  }
}
