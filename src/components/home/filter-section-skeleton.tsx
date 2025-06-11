import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

export function FilterSectionSkeleton() {
  return (
    <div className="mb-6 flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <Label>Categorías</Label>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 shrink-0 rounded" />
          ))}
        </div>
      </div>

      <div>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  )
}
