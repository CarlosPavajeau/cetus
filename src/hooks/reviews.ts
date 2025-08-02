import {
  approveProductReview,
  createProductReview,
  fetchPendingForApprovalProductReviews,
  fetchProductReviews,
  fetchReviewRequest,
  rejectProductReview,
} from '@/api/reviews'
import { useMutation, useQuery } from '@tanstack/react-query'

export function useReviewRequest(token: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['review-request', token],
    queryFn: () => fetchReviewRequest(token),
    enabled: !!token,
  })

  return {
    reviewRequest: data,
    isLoading,
    error,
  }
}

export function useCreateProductReview() {
  return useMutation({
    mutationKey: ['create-product-review'],
    mutationFn: createProductReview,
  })
}

export function usePendingForApprovalProductReviews() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pending-for-approval-product-reviews'],
    queryFn: () => fetchPendingForApprovalProductReviews(),
  })

  return {
    pendingForApprovalProductReviews: data,
    isLoading,
    error,
  }
}

export function useProductReviews(productId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: () => fetchProductReviews(productId),
  })

  return {
    productReviews: data,
    isLoading,
    error,
  }
}

export function useApproveProductReview() {
  return useMutation({
    mutationKey: ['approve-product-review'],
    mutationFn: approveProductReview,
  })
}

export function useRejectProductReview() {
  return useMutation({
    mutationKey: ['reject-product-review'],
    mutationFn: rejectProductReview,
  })
}
