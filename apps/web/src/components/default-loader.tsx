import { Skeleton } from './ui/skeleton'

export function DefaultLoader() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Skeleton className="h-8 w-full" />
      </div>

      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}
