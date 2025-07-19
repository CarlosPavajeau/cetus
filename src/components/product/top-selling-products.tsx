import Image from '@/components/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTopSellingProducts } from '@/hooks/products'
import { getImageUrl } from '@/shared/cdn'
import { useAppStore } from '@/store/app'
import { Badge } from '../ui/badge'

export function TopSellingProducts() {
  const { currentStore } = useAppStore()
  const { products, isLoading } = useTopSellingProducts(currentStore?.slug)

  if (isLoading) {
    return (
      <div className="col-span-4 lg:col-span-3">
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (!products) {
    return (
      <Card className="col-span-4 overflow-hidden rounded-md py-0 lg:col-span-3">
        <CardHeader className="px-6 pt-6 pb-0">
          <CardTitle>Productos más vendidos</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-4 gap-5 overflow-hidden py-0 lg:col-span-4">
      <CardHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-0">
        <CardTitle>Productos más vendidos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pb-6">
        <div className="flex flex-col gap-2.5">
          {products.map((product) => (
            <div className="overflow-hidden rounded-lg border bg-card">
              <div className="flex p-3">
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image
                    src={getImageUrl(product.imageUrl ?? 'placeholder.png')}
                    alt={product.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="ml-3 flex flex-1 flex-col">
                  <div className="flex items-center justify-between">
                    <h3 className="line-clamp-1 font-medium text-sm">
                      {product.name}
                    </h3>
                    {product.category && (
                      <Badge variant="secondary" className="rounded text-xs">
                        {product.category}
                      </Badge>
                    )}
                  </div>
                  <span className="mt-1 text-muted-foreground text-sm">
                    {product.salesCount} unidades vendidas hasta la fecha
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
