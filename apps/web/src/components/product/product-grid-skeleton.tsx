import { Skeleton } from '@/components/ui/skeleton'

export function ProductGridSkeleton() {
  return (
    <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="flex flex-col gap-4" key={i}>
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
