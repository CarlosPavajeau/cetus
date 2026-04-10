import { api } from '@cetus/web/lib/client-api'
import { useQuery } from '@tanstack/react-query'

export function useDeliveryFees() {
  return useQuery({
    queryKey: ['delivery-fees'],
    queryFn: api.deliveryFees.list,
  })
}
