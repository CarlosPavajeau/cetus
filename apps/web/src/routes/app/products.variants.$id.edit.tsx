import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { PackageIcon, TagIcon } from 'lucide-react'
import { fetchProductVariant } from '@/api/products'
import { DefaultLoader } from '@/components/default-loader'
import { UpdateProductVariantForm } from '@/components/product/update-product-variant-form'
import { ReturnButton } from '@/components/return-button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const productVariantQuery = (id: number) =>
  queryOptions({
    queryKey: ['products', 'variant', id],
    queryFn: () => fetchProductVariant(id),
  })

export const Route = createFileRoute('/app/products/variants/$id/edit')({
  loader: async ({ params, context }) => {
    const { id } = params

    await context.queryClient.ensureQueryData(productVariantQuery(Number(id)))

    return { id }
  },
  component: RouteComponent,
  pendingComponent: () => <DefaultLoader />,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(productVariantQuery(Number(id)))

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="w-full max-w-7xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <ReturnButton />
          </div>

          <Badge className="text-xs" variant="outline">
            <TagIcon />
            {data.sku}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <PackageIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-foreground">
                  Editar variante
                </CardTitle>
                <CardDescription>
                  Actualiza los detalles básicos sobre tu variante
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <UpdateProductVariantForm variant={data} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
