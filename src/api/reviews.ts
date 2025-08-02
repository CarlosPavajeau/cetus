import { anonymousApi, api } from '@/api/client'
import type { CreateProductReview } from '@/schemas/reviews'

export enum ReviewRequestStatus {
  Pending,
  Sent,
  Completed,
  Expired,
}

export type ReviewRequestProduct = {
  name: string
  imageUrl: string
}

export type ReviewRequest = {
  id: string
  status: ReviewRequestStatus
  customer: string
  product: ReviewRequestProduct
}

export async function fetchReviewRequest(token: string) {
  const response = await api.get<ReviewRequest>(`/reviews/requests/${token}`)

  return response.data
}

export async function createProductReview(request: CreateProductReview) {
  const response = await api.post(`/reviews/products`, request)

  return response.data
}

export type PendingForApprovalProductReview = {
  id: string
  comment: string
  rating: number
  customer: string
  product: ReviewRequestProduct
  createdAt: string
}

export async function fetchPendingForApprovalProductReviews() {
  const response = await api.get<PendingForApprovalProductReview[]>('/reviews/products/pending')

  return response.data
}

export type ProductReview = {
  id: string
  comment: string
  rating: number
  customer: string
  createdAt: string
}

export async function fetchProductReviews(productId: string) {
  const response = await anonymousApi.get<ProductReview[]>(
    `/reviews/products/${productId}`,
  )

  return response.data
}

export async function approveProductReview(reviewId: string) {
  const response = await api.post(`/reviews/products/${reviewId}/approve`)

  return response.data
}

export type RejectProductReviewRequest = {
  id: string
  moderatorNotes: string
}

export async function rejectProductReview(request: RejectProductReviewRequest) {
  const response = await api.post(
    `/reviews/products/${request.id}/reject`,
    request,
  )

  return response.data
}
