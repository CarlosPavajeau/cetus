import { VerifiedIcon } from 'lucide-react'
import type { ProductReview as ProductReviewType } from '@/api/reviews'
import { FormattedDate } from '@/components/formatted-date'
import { StarRating } from '@/components/product/star-rating'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type Props = {
  review: ProductReviewType
}

export function ProductReview({ review }: Readonly<Props>) {
  return (
    <Card className="w-full rounded-none border-0 border-b bg-transparent p-0 pb-2 shadow-none last:border-b-0">
      <CardContent className="flex flex-col gap-2 p-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-sm">{review.customer}</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <VerifiedIcon className="h-4 w-4 text-success-base" />
                  </TooltipTrigger>
                  <TooltipContent className="px-2 py-1 text-xs">
                    <span>Compra verificada</span>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-muted-foreground text-xs">
                <FormattedDate date={new Date(review.createdAt)} />
              </p>
            </div>
          </div>
          <StarRating maxRating={5} rating={review.rating} />
        </div>

        <div className="space-y-2">
          <p className="text-sm leading-relaxed">{review.comment}</p>
        </div>
      </CardContent>
    </Card>
  )
}
