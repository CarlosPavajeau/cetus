import { api } from '@cetus/web/lib/client-api'
import { useQuery } from '@tanstack/react-query'

export function useCouponRules(id: number) {
  return useQuery({
    queryKey: ['coupon', 'rules', id],
    queryFn: () => api.coupons.listRules(id),
  })
}
