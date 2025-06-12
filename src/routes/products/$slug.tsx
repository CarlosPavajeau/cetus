import { DefaultLoader } from '@/components/default-loader'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { PageHeader } from '@/components/page-header'
import { ProductDisplay } from '@/components/product/product-display'
import { ProductTabs } from '@/components/product/product-tabs'
import { SuggestedProducts } from '@/components/product/suggested-product'
import { Button } from '@/components/ui/button'
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
        <DefaultLoader />
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
