import type { ProductCostWarning } from '@cetus/api-client/types/reports'
import { Badge } from '@cetus/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@cetus/ui/card'
import { AlertTriangleIcon } from 'lucide-react'

type Props = {
  products: ProductCostWarning[]
}

export function ProductsWithoutCostAlert({ products }: Readonly<Props>) {
  if (products.length === 0) {
    return null
  }

  const title =
    products.length === 1
      ? '1 producto sin costo registrado'
      : `${products.length} productos sin costo registrado`

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-medium text-amber-700 text-sm dark:text-amber-400">
          <AlertTriangleIcon className="size-4 shrink-0" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-amber-700/80 text-sm dark:text-amber-400/80">
          Los siguientes productos no tienen costo configurado y pueden afectar
          el cálculo de rentabilidad:
        </p>
        <div className="flex flex-wrap gap-2">
          {products.map((product) => (
            <Badge
              className="gap-1.5"
              key={product.variantId}
              variant="outline"
            >
              <span>{product.productName}</span>
              <span className="font-mono text-muted-foreground text-xs">
                {product.sku}
              </span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
