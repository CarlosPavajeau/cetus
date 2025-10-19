import { StarRating } from '@/components/product/star-rating'

type Props = {
  rating: number
  reviewsCount: number
  maxRating?: number
  className?: string
}

export function ProductRating({
  rating,
  reviewsCount,
  maxRating = 5,
  className = '',
}: Readonly<Props>) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <StarRating maxRating={maxRating} rating={rating} />
      <span className="text-muted-foreground text-xs">
        ({reviewsCount} {reviewsCount === 1 ? 'reseña' : 'reseñas'})
      </span>
    </div>
  )
}
