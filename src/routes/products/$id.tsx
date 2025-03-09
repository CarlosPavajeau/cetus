import { DefaultLoader } from '@/components/default-loader'
import { ProductDisplay } from '@/components/product-display'
import { useProduct } from '@/hooks/use-product'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/products/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const params = Route.useParams()
  const id = params.id

  const { product, isLoading } = useProduct(id)

  if (isLoading) {
    return <DefaultLoader />
  }

  return <div>{product && <ProductDisplay product={product} />}</div>
}
