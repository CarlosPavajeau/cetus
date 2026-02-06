import { StarIcon } from 'lucide-react'

type Props = {
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
}: Readonly<Props>) {
  return (
    <div className={`flex ${className}`}>
      {Array.from({ length: maxRating }).map((_, i) => (
        <StarIcon
          className={`h-${size} w-${size} ${
            i < rating
              ? 'fill-warning-base text-warning-base'
              : 'text-muted-foreground'
          }`}
          height={16}
          key={i}
          width={16}
        />
      ))}
    </div>
  )
}
