import type { ProductReview as ProductReviewType } from '@/api/reviews'
import { FormattedDate } from '@/components/formatted-date'
import { Card, CardContent } from '@/components/ui/card'
import { StarRating } from './star-rating'

type Props = {
  review: ProductReviewType
}

export function ProductReview({ review }: Props) {
  return (
    <Card className="w-full rounded-none border-0 border-b bg-transparent py-4 shadow-none last:border-b-0">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-medium text-sm">{review.customer}</p>
              <p className="text-muted-foreground text-xs">
                <FormattedDate date={new Date(review.createdAt)} />
              </p>
            </div>
          </div>
          <StarRating rating={review.rating} maxRating={5} />
        </div>

        <div className="space-y-2">
          <p className="text-sm leading-relaxed">{review.comment}</p>
        </div>
      </CardContent>
    </Card>
  )
}
