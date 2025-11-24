import { Button } from '@cetus/ui/button'
import { ProductsTable } from '@cetus/web/features/products/components/products-table'
import { productQueries } from '@cetus/web/features/products/queries'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'

export const Route = createFileRoute('/app/products/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: products, isLoading } = useQuery(productQueries.list)

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-semibold text-2xl">Productos</h1>
        <div>
          <Button asChild className="ml-auto">
            <Link to="/app/products/new">
              <PlusIcon
                aria-hidden="true"
                className="-ms-1 opacity-60"
                size={16}
              />
              Crear producto
            </Link>
          </Button>
        </div>
      </div>

      <ProductsTable isLoading={isLoading} products={products} />
    </div>
  )
}
