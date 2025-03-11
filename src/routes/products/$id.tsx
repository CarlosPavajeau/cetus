import { DefaultLoader } from '@/components/default-loader'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { ProductDisplay } from '@/components/product-display'
import { Button } from '@/components/ui/button'
import { useProduct } from '@/hooks/use-product'
import { Link, createFileRoute } from '@tanstack/react-router'
import { CircleAlertIcon, Home } from 'lucide-react'
import { memo, useEffect } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/products/$id')({
  component: ProductDetailsPage,
})

function ProductDetailsPage() {
  return <RouteComponent />
}

const RouteComponent = memo(function RouteComponent() {
  const { id } = Route.useParams()
  const { product, isLoading, error } = useProduct(id)

  useEffect(() => {
    if (error) {
      toast.error('Error al cargar el producto', {
        description: 'Por favor, inténtalo de nuevo más tarde.',
      })
    }
  }, [error])

  if (isLoading) {
    return (
      <DefaultPageLayout showCart>
        <DefaultLoader />
      </DefaultPageLayout>
    )
  }

  if (error) {
    return (
      <DefaultPageLayout showCart>
        <div className="container my-12 flex flex-col items-center justify-center px-4">
          <div className="mb-6 rounded-md border px-4 py-3">
            <div className="flex gap-3">
              <CircleAlertIcon
                className="mt-0.5 shrink-0 text-red-500 opacity-60"
                size={16}
                aria-hidden="true"
              />
              <div className="grow space-y-1">
                <p className="font-medium text-sm">
                  No pudimos cargar la información del producto. Por favor,
                  inténtalo de nuevo.
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Volver al inicio
            </Link>
          </Button>
        </div>
      </DefaultPageLayout>
    )
  }

  if (!product) {
    return (
      <DefaultPageLayout showCart>
        <div className="container my-12 flex flex-col items-center justify-center px-4">
          <div className="mx-auto mb-6 max-w-lg rounded-lg border bg-muted p-4">
            <h2 className="mb-2 font-semibold text-lg">
              Producto no encontrado
            </h2>
            <p className="text-muted-foreground">
              El producto que estás buscando no existe o ha sido eliminado.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Ver todos los productos
            </Link>
          </Button>
        </div>
      </DefaultPageLayout>
    )
  }

  return <ProductDisplay key={product.id} product={product} />
})
