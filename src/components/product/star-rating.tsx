import { StarIcon } from 'lucide-react'

type StarRatingProps = {
  rating: number
  maxRating?: number
  className?: string
}

export function StarRating({
  rating,
  maxRating = 5,
  className = '',
}: StarRatingProps) {
  return (
    <div className={`flex ${className}`}>
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
  )
}
