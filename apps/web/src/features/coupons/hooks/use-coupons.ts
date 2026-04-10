import { api } from '@cetus/web/lib/client-api'
import { useQuery } from '@tanstack/react-query'

export function useCoupons() {
  return useQuery({
    queryKey: ['coupons'],
    queryFn: api.coupons.list,
  })
}
