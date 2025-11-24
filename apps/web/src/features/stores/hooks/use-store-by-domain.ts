import { api } from '@cetus/api-client'
import { useQuery } from '@tanstack/react-query'

export function useStoreByDomain(domain: string) {
  return useQuery({
    queryKey: ['store', domain],
    queryFn: () => api.stores.getByDomain(domain),
  })
}
