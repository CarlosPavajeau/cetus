import { PendingReviewsTable } from '@cetus/web/features/reviews/components/pending-reviews-table'
import { usePendingForApprovalProductReviews } from '@cetus/web/features/reviews/hooks/user-pending-for-approval-product-reviews'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/reviews')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isLoading } = usePendingForApprovalProductReviews()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading font-semibold text-2xl">
          Reseñas pendientes de aprobación
        </h1>
      </div>

      <PendingReviewsTable isLoading={isLoading} reviews={data} />
    </div>
  )
}
