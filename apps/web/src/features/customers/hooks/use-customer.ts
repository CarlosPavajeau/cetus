import { api } from '@cetus/api-client'
import { useQuery } from '@tanstack/react-query'

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => api.customers.getById(id),
    enabled: !!id,
  })
}
