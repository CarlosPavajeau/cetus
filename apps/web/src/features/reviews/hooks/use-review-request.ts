import { api } from '@cetus/web/lib/client-api'
import { useQuery } from '@tanstack/react-query'

export function useReviewRequest(token: string) {
  return useQuery({
    queryKey: ['review-request', token],
    queryFn: () => api.reviews.getByToken(token),
    enabled: !!token,
  })
}
