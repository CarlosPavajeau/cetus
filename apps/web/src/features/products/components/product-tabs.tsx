import type { ProductReview } from '@cetus/api-client/types/reviews'
import { Alert, AlertDescription, AlertTitle } from '@cetus/ui/alert'
import { Badge } from '@cetus/ui/badge'
import { ProductReviewCard } from '@cetus/web/features/products/components/product-review'
import { InfoIcon } from 'lucide-react'

type Props = {
  reviews: ProductReview[]
}

export function ProductTabs({ reviews }: Readonly<Props>) {
  if (reviews.length === 0) {
    return (
      <Alert>
        <InfoIcon />
        <AlertTitle>No hay reseñas</AlertTitle>
        <AlertDescription>
          Este producto aún no tiene reseñas.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 border-b pb-3">
        <h2 className="font-heading font-semibold text-lg">Reseñas</h2>
        <Badge variant="secondary">{reviews.length}</Badge>
      </div>

      <div className="mt-4 max-h-96 overflow-y-auto rounded border bg-card p-4">
        <div className="flex flex-col gap-2">
          {reviews.map((review) => (
            <ProductReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </div>
  )
}
