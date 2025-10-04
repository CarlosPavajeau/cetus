import { fetchProductVariants, type Product } from '@/api/products'
import { Currency } from '@/components/currency'
import { DefaultLoader } from '@/components/default-loader'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { PackageIcon, TagIcon } from 'lucide-react'

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
              <CardTitle className="text-foreground">
                Variantes del producto
              </CardTitle>
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
            <CardTitle className="text-foreground">
              Variantes del producto
            </CardTitle>
            <CardDescription>
              Actualiza las variantes del producto
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {data.map((variant) => (
            <div
              className="overflow-hidden rounded-md border bg-card"
              key={variant.sku}
            >
              <div className="flex p-3">
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="line-clamp-1 font-medium text-sm">
                        {variant.optionValues.map((v) => v.value).join(' / ')}
                      </h3>

                      <Badge className="text-xs" variant="outline">
                        <TagIcon className="inline h-3 w-3" />
                        {variant.sku}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {variant.optionValues.map((value) => (
                      <Badge key={value.id} variant="secondary">
                        {value.optionTypeName}: {value.value}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-muted-foreground text-sm">
                      Stock:{' '}
                      <span className="text-foreground">{variant.stock}</span>
                    </span>

                    <span className="text-muted-foreground text-sm">
                      Precio:{' '}
                      <span className="text-foreground">
                        <Currency currency="COP" value={variant.price} />
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
