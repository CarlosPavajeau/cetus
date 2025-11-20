export type ReviewRequestStatus = 'pending' | 'sent' | 'completed' | 'expired'

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

export type PendingForApprovalProductReview = {
  id: string
  comment: string
  rating: number
  customer: string
  product: ReviewRequestProduct
  createdAt: string
}

export type ProductReview = {
  id: string
  comment: string
  rating: number
  customer: string
  createdAt: string
}

export type RejectProductReviewRequest = {
  id: string
  moderatorNotes: string
}

export type CreateProductReview = {
  reviewRequestId: string
  rating: number
  comment: string
}
