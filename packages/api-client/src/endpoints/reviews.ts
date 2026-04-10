import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type {
  CreateProductReview,
  PendingForApprovalProductReview,
  ProductReview,
  RejectProductReviewRequest,
  ReviewRequest,
} from '../types/reviews'

const definitions = {
  list: {
    method: 'GET',
    path: (id: string) => `/reviews/products/${id}`,
  } as EndpointDefinition<ProductReview[], void, string>,
  listPendingForApproval: {
    method: 'GET',
    path: '/reviews/products/pending',
  } as EndpointDefinition<PendingForApprovalProductReview[]>,
  getByToken: {
    method: 'GET',
    path: (token: string) => `/reviews/requests/${token}`,
  } as EndpointDefinition<ReviewRequest, void, string>,
  create: {
    method: 'POST',
    path: '/reviews/products',
  } as EndpointDefinition<void, CreateProductReview>,
  approve: {
    method: 'POST',
    path: (reviewId: string) => `/reviews/products/${reviewId}/approve`,
  } as EndpointDefinition<void, void, string>,
  reject: {
    method: 'POST',
    path: (reviewId: string) => `/reviews/products/${reviewId}/reject`,
  } as EndpointDefinition<void, RejectProductReviewRequest, string>,
}

export const reviewsApi = defineResource(definitions)
