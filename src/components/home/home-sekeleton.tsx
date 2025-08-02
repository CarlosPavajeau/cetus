import { DefaultPageLayout } from '@/components/default-page-layout'
import { HeroSection } from '@/components/home/hero-section'
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton'

export function HomeSkeleton() {
  return (
    <DefaultPageLayout>
      <HeroSection />

      <div className="flex flex-col items-center gap-6 pb-6">
        <p className="w-full text-left font-heading font-medium text-2xl">
          Productos destacados
        </p>

        <ProductGridSkeleton />
      </div>

      <div className="my-8 flex flex-col items-center gap-6 rounded p-4">
        <p className="w-full text-left font-heading font-medium text-3xl">
          Productos populares
        </p>

        <ProductGridSkeleton />
      </div>
    </DefaultPageLayout>
  )
}
