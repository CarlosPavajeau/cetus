import { useQuery } from '@tanstack/react-query'
import { PackageIcon } from 'lucide-react'
import { fetchProductVariants, type Product } from '@/api/products'
import { DefaultLoader } from '@/components/default-loader'
import { UpdateProductVariantForm } from '@/components/product/update-product-variant-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Props = {
  product: Product
}

export function ProductVariants({ product }: Props) {
  const { isLoading, data, error } = useQuery({
    queryKey: ['products', 'variant', product.id],
    queryFn: () => fetchProductVariants(product.id),
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <DefaultLoader />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <p className="text-destructive text-sm">
            Error al cargar las variantes del producto
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <PackageIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Variantes del producto</CardTitle>
              <CardDescription>
                Actualiza las variantes del producto
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Este producto no tiene variantes configuradas
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <PackageIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Variantes del producto</CardTitle>
            <CardDescription>
              Actualiza las variantes del producto
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {data.map((variant) => (
            <UpdateProductVariantForm
              key={variant.id}
              productId={product.id}
              variant={variant}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
