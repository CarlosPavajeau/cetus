import { Skeleton } from '@cetus/ui/skeleton'
import { PendingReviewsTable } from '@cetus/web/features/reviews/components/pending-reviews-table'
import { usePendingForApprovalProductReviews } from '@cetus/web/features/reviews/hooks/user-pending-for-approval-product-reviews'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/reviews')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isLoading } = usePendingForApprovalProductReviews()

  return (
    <div className="space-y-6 p-4">
      <h1 className="font-heading font-semibold text-xl">
        Reseñas pendientes de aprobación
      </h1>

      {isLoading && <Skeleton className="h-10 w-full" />}

      {!isLoading && <PendingReviewsTable reviews={data} />}
    </div>
  )
}
