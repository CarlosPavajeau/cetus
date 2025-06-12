import { DefaultPageLayout } from '@/components/default-page-layout'
import { PageHeader } from '@/components/page-header'
import { ProductDisplay } from '@/components/product/product-display'
import { ProductTabs } from '@/components/product/product-tabs'
import { SuggestedProducts } from '@/components/product/suggested-product'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useProductBySlug, useProductSuggestions } from '@/hooks/products'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Home } from 'lucide-react'
import { memo, useEffect } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/products/$slug')({
  component: ProductDetailsPage,
})

function ProductDetailsPage() {
  return <RouteComponent />
}

const RouteComponent = memo(function RouteComponent() {
  const { slug } = Route.useParams()

  const { product, isLoading, error } = useProductBySlug(slug)
  const { suggestions } = useProductSuggestions(product?.id)

  useEffect(() => {
    if (error) {
      toast.error('Error al cargar el producto', {
        description: 'Por favor, inténtalo de nuevo más tarde.',
      })
    }
  }, [error])

  if (isLoading) {
    return (
      <DefaultPageLayout>
        <ProductDisplaySkeleton />
      </DefaultPageLayout>
    )
  }

  if (error) {
    return (
      <DefaultPageLayout>
        <PageHeader
          title="Error al cargar el producto"
          subtitle="Por favor, inténtalo de nuevo más tarde."
        />

        <Button asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Volver al inicio
          </Link>
        </Button>
      </DefaultPageLayout>
    )
  }

  if (!product) {
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
  }

  return (
    <DefaultPageLayout>
      <div className="flex flex-col gap-8">
        <ProductDisplay key={product.id} product={product} />

        <div>
          <ProductTabs id={product.id} />
        </div>

        <SuggestedProducts products={suggestions ?? []} />
      </div>
    </DefaultPageLayout>
  )
})

function ProductDisplaySkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="mb-2">
        <Skeleton className="h-9 w-24" />
      </div>

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
