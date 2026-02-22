import { StarIcon } from 'lucide-react'

type Props = {
  rating: number
  size?: number
  maxRating?: number
  spacing?: number
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 5,
  spacing = 1,
}: Readonly<Props>) {
  return (
    <div
      aria-label={`${rating} de 5 estrellas`}
      className={`flex items-center gap-${spacing}`}
      role="img"
    >
      {Array.from({ length: maxRating }).map((_, i) => (
        <StarIcon
          className={`size-${size} ${
            i < rating
              ? 'fill-amber-300 text-amber-300'
              : 'fill-amber-300/40 text-amber-300/40'
          }`}
          // biome-ignore lint/suspicious/noArrayIndexKey: the index is used as a unique key for the element
          key={i}
        />
      ))}
    </div>
  )
}
