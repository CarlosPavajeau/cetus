import { api } from '@cetus/api-client'
import { useQuery } from '@tanstack/react-query'

export function useStoreBySlug(slug: string) {
  return useQuery({
    queryKey: ['store', slug],
    queryFn: () => api.stores.getBySlug(slug),
    enabled: !!slug,
  })
}
