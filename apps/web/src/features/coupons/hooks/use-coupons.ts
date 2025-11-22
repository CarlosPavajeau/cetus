import { api } from '@cetus/api-client'
import { useQuery } from '@tanstack/react-query'

export function useCoupons() {
  return useQuery({
    queryKey: ['coupons'],
    queryFn: api.coupons.list,
  })
}
