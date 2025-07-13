import { fetchProductBySlug, fetchProductSuggestions } from '@/api/products'
import { fetchProductReviews } from '@/api/reviews'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { PageHeader } from '@/components/page-header'
import { ProductDisplay } from '@/components/product/product-display'
import { ProductTabs } from '@/components/product/product-tabs'
import { SuggestedProducts } from '@/components/product/suggested-product'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/store/app'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Home } from 'lucide-react'

export const Route = createFileRoute('/products/$slug')({
  loader: async (context) => {
    const slug = context.params.slug
    const product = await fetchProductBySlug(slug)

    const [suggestions, reviews] = await Promise.all([
      fetchProductSuggestions(product.id),
      fetchProductReviews(product.id),
    ])

    return {
      product,
      suggestions,
      reviews,
    }
  },
  component: ProductDetailsPage,
  notFoundComponent: () => {
    return (
      <DefaultPageLayout>
        <PageHeader
          title="Producto no encontrado"
          subtitle="El producto que estás buscando no existe."
        />

        <Button asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Volver al inicio
          </Link>
        </Button>
      </DefaultPageLayout>
    )
  },
  pendingComponent: () => {
    return (
      <DefaultPageLayout>
        <ProductDisplaySkeleton />
      </DefaultPageLayout>
    )
  },
})

function ProductDetailsPage() {
  const { product, suggestions, reviews } = Route.useLoaderData()
  const { currentStore } = useAppStore()

  return (
    <DefaultPageLayout>
      <title>{`${product.name} | ${currentStore?.name}`}</title>

      <div className="flex flex-col gap-8">
        <ProductDisplay key={product.id} product={product} />

        <div>
          <ProductTabs reviews={reviews} />
        </div>

        <SuggestedProducts products={suggestions} />
      </div>
    </DefaultPageLayout>
  )
}

function ProductDisplaySkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <div className="relative aspect-square overflow-hidden rounded-lg border">
          <Skeleton className="h-full w-full" />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>

          <div className="h-px w-full bg-border" />

          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>

          <div className="prose prose-sm">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          <div className="flex flex-1 flex-col gap-6">
            <div className="flex items-center">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="ml-2 h-9 w-32" />
            </div>

            <div className="flex items-center gap-2">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-11" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
