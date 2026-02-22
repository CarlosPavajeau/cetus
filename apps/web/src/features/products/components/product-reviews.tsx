import type { ProductForSale } from '@cetus/api-client/types/products'
import type { ProductReview } from '@cetus/api-client/types/reviews'
import { Avatar, AvatarFallback } from '@cetus/ui/avatar'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import { Progress } from '@cetus/ui/progress'
import { formatDistance } from 'date-fns'
import { es } from 'date-fns/locale'
import { Star, ThumbsUp } from 'lucide-react'
import React from 'react'
import { StarRating } from './star-rating'

function getReviewTitle(review: ProductReview) {
  switch (review.rating) {
    case 1:
      return 'Muy malo'
    case 2:
      return 'Malo'
    case 3:
      return 'Regular'
    case 4:
      return 'Bueno'
    case 5:
      return 'Excelente'
    default:
      return 'Sin título'
  }
}

type Props = {
  product: ProductForSale
  reviews: ProductReview[]
}

export function ProductReviews({ product, reviews }: Props) {
  const ratingBreakdown = React.useMemo(() => {
    const breakdown = Array(5).fill(0)
    reviews.forEach((review) => {
      breakdown[review.rating - 1]++
    })
    return breakdown.map((count, index) => ({
      stars: index + 1,
      count,
      percentage: (count / reviews.length) * 100,
    }))
  }, [reviews])

  return (
    <section className="border-border border-t py-16">
      <div className="mb-12 flex flex-col gap-4">
        <Badge className="w-fit text-xs" variant="outline">
          Reseñas
        </Badge>
        <h2 className="text-balance font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
          Lo que dicen los clientes.
        </h2>
      </div>

      <div className="grid gap-12 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border p-6">
            <span className="font-bold text-5xl text-foreground tracking-tight">
              {product.rating}
            </span>
            <StarRating rating={product.rating} size={4} spacing={0.5} />
            <span className="text-muted-foreground text-sm">
              Basado en {product.reviewsCount} reviews
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {ratingBreakdown.map((item) => (
              <div className="flex items-center gap-3" key={item.stars}>
                <span className="w-8 text-right text-muted-foreground text-xs">
                  {item.stars}
                  <Star className="ml-0.5 inline size-3 fill-amber-300 text-amber-300" />
                </span>
                <Progress className="h-1.5 flex-1" value={item.percentage} />
                <span className="w-8 text-foreground text-xs">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {reviews.map((review) => (
            <div
              className="rounded-xl border border-border bg-card p-6 transition-colors"
              key={review.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9 border border-border">
                    <AvatarFallback className="text-xs">
                      {review.customer.charAt(0).toLocaleUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">
                        {review.customer}
                      </span>
                      <Badge
                        className="rounded-md px-1.5 py-0 font-medium text-[10px] text-muted-foreground"
                        variant="outline"
                      >
                        Verificada
                      </Badge>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {formatDistance(new Date(review.createdAt), new Date(), {
                        locale: es,
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                <StarRating rating={review.rating} size={3} spacing={0.5} />
              </div>

              <div className="mt-4">
                <h4 className="font-semibold text-foreground text-sm">
                  {getReviewTitle(review)}
                </h4>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  {review.comment}
                </p>
              </div>

              <div className="mt-4 flex items-center border-border border-t pt-4">
                <Button
                  className="h-7 gap-1.5 rounded-md px-2 text-muted-foreground text-xs hover:text-foreground"
                  size="sm"
                  variant="ghost"
                >
                  <ThumbsUp className="size-3" />
                  Útil ({review.rating})
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
