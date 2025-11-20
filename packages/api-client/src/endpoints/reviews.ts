import { anonymousClient, authenticatedClient } from '../core/instance'
import type {
  CreateProductReview,
  PendingForApprovalProductReview,
  ProductReview,
  RejectProductReviewRequest,
  ReviewRequest,
} from '../types/reviews'

export const reviewsApi = {
  list: (productId: string) =>
    anonymousClient.get<ProductReview[]>(`reviews/products/${productId}`),

  listPendingForApproval: () =>
    authenticatedClient.get<PendingForApprovalProductReview[]>(
      'reviews/products/pending',
    ),

  getByToken: (token: string) =>
    anonymousClient.get<ReviewRequest>(`reviews/requests/${token}`),

  create: (data: CreateProductReview) =>
    anonymousClient.post<void>('reviews/products', data),

  approve: (reviewId: string) =>
    authenticatedClient.post<void>(`reviews/products/${reviewId}/approve`),

  reject: (data: RejectProductReviewRequest) =>
    authenticatedClient.post<void>(`reviews/products/${data.id}/reject`, data),
}
