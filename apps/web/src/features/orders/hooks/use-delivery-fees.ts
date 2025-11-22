import { api } from '@cetus/api-client'
import { useQuery } from '@tanstack/react-query'

export function useDeliveryFees() {
  return useQuery({
    queryKey: ['delivery-fees'],
    queryFn: api.orders.deliveryFees.list,
  })
}
