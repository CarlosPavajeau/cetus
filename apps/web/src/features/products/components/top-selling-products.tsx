import { getImageUrl } from '@cetus/shared/utils/image'
import { Badge } from '@cetus/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@cetus/ui/card'
import { Skeleton } from '@cetus/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { Image } from '@unpic/react'
import { productQueries } from '../queries'

export function TopSellingProducts() {
  const { data, isLoading } = useQuery(productQueries.topSelling)

  if (isLoading) {
    return (
      <div className="col-span-4 lg:col-span-3">
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (!data) {
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
          {data.map((product) => (
            <div
              className="overflow-hidden rounded-lg border bg-card"
              key={product.id}
            >
              <div className="flex p-3">
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image
                    alt={product.name}
                    className="object-cover"
                    height={80}
                    layout="constrained"
                    objectFit="cover"
                    sizes="80px"
                    src={getImageUrl(product.imageUrl ?? 'placeholder.png')}
                    width={80}
                  />
                </div>
                <div className="ml-3 flex flex-1 flex-col">
                  <div className="flex items-center justify-between">
                    <h3 className="line-clamp-1 font-medium text-sm">
                      {product.name}
                    </h3>
                    {product.category && (
                      <Badge className="rounded text-xs" variant="secondary">
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
