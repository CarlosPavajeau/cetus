import { api } from '@cetus/web/lib/client-api'
import { useQuery } from '@tanstack/react-query'

export function usePendingForApprovalProductReviews() {
  return useQuery({
    queryKey: ['pending-for-approval-product-reviews'],
    queryFn: api.reviews.listPendingForApproval,
  })
}
