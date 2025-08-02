import { fetchProductBySlug, fetchProductSuggestions } from '@/api/products'
import { fetchProductReviews } from '@/api/reviews'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { PageHeader } from '@/components/page-header'
import { ProductDisplay } from '@/components/product/product-display'
import { ProductTabs } from '@/components/product/product-tabs'
import { SuggestedProducts } from '@/components/product/suggested-product'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTenantStore } from '@/store/use-tenant-store'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ChevronRight, Home, HomeIcon } from 'lucide-react'

export const Route = createFileRoute('/products/$slug')({
  beforeLoad: () => {
    const { store } = useTenantStore.getState()

    if (!store) {
      throw redirect({
        to: '/',
        search: {
          redirectReason: 'NO_STORE_SELECTED',
        },
      })
    }
  },
  loader: async ({ params }) => {
    const slug = params.slug
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
  const { store } = useTenantStore()

  return (
    <DefaultPageLayout>
      <title>{`${product.name} | ${store?.name}`}</title>

      <div className="container flex max-w-7xl flex-col gap-6">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="text-xs">
                <Link to="/">
                  <HomeIcon size={12} aria-hidden="true" />
                  <span className="sr-only">Home</span>
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="text-xs">
                <BreadcrumbLink href="#">{product.category}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="text-xs">
                <BreadcrumbPage>{product.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

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
    <div className="container min-h-screen max-w-7xl">
      <div className="px-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-32" />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-50">
              <Skeleton className="h-full w-full" />
            </div>

            <div className="hidden space-x-2 lg:flex">
              {[...Array(4)].map((_, index) => (
                <Skeleton key={index} className="h-20 w-20 rounded-lg" />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Skeleton className="mb-2 h-8 w-3/4" />
              <Skeleton className="mb-4 h-10 w-32" />

              <div className="mb-4 flex items-center space-x-2">
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-5 w-5 rounded" />
                  ))}
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-32" />
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
