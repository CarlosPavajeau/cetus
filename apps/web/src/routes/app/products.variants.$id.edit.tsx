import { Badge } from '@cetus/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cetus/ui/card'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { ReturnButton } from '@cetus/web/components/return-button'
import { UpdateProductVariantForm } from '@cetus/web/features/products/components/edit-product-variant-form'
import { productQueries } from '@cetus/web/features/products/queries'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { PackageIcon, TagIcon } from 'lucide-react'

export const Route = createFileRoute('/app/products/variants/$id/edit')({
  loader: async ({ params, context }) => {
    const { id } = params

    await context.queryClient.ensureQueryData(
      productQueries.variants.detail(Number(id)),
    )

    return { id }
  },
  component: RouteComponent,
  pendingComponent: () => (
    <div className="p-4">
      <DefaultLoader />
    </div>
  ),
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(productQueries.variants.detail(Number(id)))

  return (
    <div className="flex flex-1 flex-col items-center p-4">
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
                  <div className="mt-2 flex items-center gap-2">
                    {data.optionValues.map((value) => (
                      <Badge key={value.id}>
                        {value.optionTypeName}: {value.value}
                      </Badge>
                    ))}
                  </div>
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
