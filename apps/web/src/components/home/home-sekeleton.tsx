import { DefaultPageLayout } from '@/components/default-page-layout'
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export function HomeSkeleton() {
  return (
    <DefaultPageLayout>
      <HeroSectionSkeleton />

      <div className="flex flex-col items-center gap-6 pb-6">
        <div className="w-full">
          <Skeleton className="h-6 w-52" />
        </div>

        <ProductGridSkeleton />
      </div>

      <div className="my-8 flex flex-col items-center gap-6 rounded p-4">
        <div className="w-full">
          <Skeleton className="h-6 w-52" />
        </div>

        <ProductGridSkeleton />
      </div>
    </DefaultPageLayout>
  )
}

function HeroSectionSkeleton() {
  return <Skeleton className="mb-8 flex h-64 w-full min-w-full" />
}
