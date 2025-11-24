import type { Product } from '@cetus/api-client/types/products'
import { Badge } from '@cetus/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cetus/ui/card'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { productQueries } from '@cetus/web/features/products/queries'
import { useQuery } from '@tanstack/react-query'
import { SettingsIcon } from 'lucide-react'

type Props = {
  product: Product
}

export function UpdateProductOptionsForm({ product }: Readonly<Props>) {
  const { isLoading, data, error } = useQuery(
    productQueries.options.list(product.id),
  )

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
            Error al cargar las opciones del producto
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
              <SettingsIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground">
                Opciones del producto
              </CardTitle>
              <CardDescription>
                Opciones disponibles para tu producto
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Este producto no tiene opciones configuradas
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
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-foreground">
              Opciones del producto
            </CardTitle>
            <CardDescription>
              Opciones disponibles para tu producto
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {data.length > 0 && (
          <div className="flex flex-col gap-2">
            {data.map((option) => (
              <div
                className="overflow-hidden rounded-md border bg-card"
                key={`${option.productId}-${option.optionTypeId}`}
              >
                <div className="flex p-3">
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex justify-between">
                      <h3 className="line-clamp-1 font-medium text-sm">
                        {option.optionType.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {option.optionType.values.map((value) => (
                        <Badge key={value.id} variant="secondary">
                          {value.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
