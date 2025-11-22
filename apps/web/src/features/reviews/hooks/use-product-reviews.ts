import { api } from '@cetus/api-client'
import { useQuery } from '@tanstack/react-query'

export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => api.reviews.list(productId),
  })
}
