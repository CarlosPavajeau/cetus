import { StarIcon } from 'lucide-react'

type StarRatingProps = {
  rating: number
  size?: number
  maxRating?: number
  className?: string
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 5,
  className = '',
}: StarRatingProps) {
  return (
    <div className={`flex ${className}`}>
      {[...Array(maxRating)].map((_, i) => (
        <StarIcon
          key={i}
          width={16}
          height={16}
          className={`h-${size} w-${size} ${
            i < rating
              ? 'fill-warning-base text-warning-base'
              : 'text-muted-foreground'
          }`}
        />
      ))}
    </div>
  )
}
