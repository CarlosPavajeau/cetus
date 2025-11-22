import { api } from '@cetus/api-client'
import { useQuery } from '@tanstack/react-query'

export function useReviewRequest(token: string) {
  return useQuery({
    queryKey: ['review-request', token],
    queryFn: () => api.reviews.getByToken(token),
    enabled: !!token,
  })
}
