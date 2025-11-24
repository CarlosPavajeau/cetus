import { api } from '@cetus/api-client'
import { useQuery } from '@tanstack/react-query'

export function usePendingForApprovalProductReviews() {
  return useQuery({
    queryKey: ['pending-for-approval-product-reviews'],
    queryFn: api.reviews.listPendingForApproval,
  })
}
