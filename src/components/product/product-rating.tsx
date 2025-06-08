import { StarIcon } from 'lucide-react'

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
}: Props) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex">
        {[...Array(maxRating)].map((_, i) => (
          <StarIcon
            key={i}
            className={`h-4 w-4 ${
              i < rating
                ? 'fill-warning-base text-warning-base'
                : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
      <span className="text-muted-foreground text-xs">
        ({reviewsCount} reseñas)
      </span>
    </div>
  )
}
