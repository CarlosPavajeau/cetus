import { Badge } from '@cetus/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@cetus/ui/tabs'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { ReturnButton } from '@cetus/web/components/return-button'
import { ProductVariants } from '@cetus/web/features/products/components/product-variants'
import { UpdateProductForm } from '@cetus/web/features/products/components/update-product-form'
import { UpdateProductOptionsForm } from '@cetus/web/features/products/components/update-product-options-form'
import { productQueries } from '@cetus/web/features/products/queries'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { PackageIcon, SettingsIcon, TagIcon } from 'lucide-react'

export const Route = createFileRoute('/app/products/$id/details')({
  loader: async ({ params, context }) => {
    const { id } = params

    const product = await context.queryClient.ensureQueryData(
      productQueries.detail(id),
    )

    return product
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
  const { data: product } = useSuspenseQuery(productQueries.detail(id))

  return (
    <div className="flex flex-1 flex-col items-center p-4">
      <div className="w-full max-w-7xl space-y-3">
        <div className="flex items-center justify-between space-y-2">
          <ReturnButton className="m-0" />

          <Badge className="text-xs" variant="outline">
            <TagIcon className="inline h-3 w-3" />
            {product.slug}
          </Badge>
        </div>

        <Tabs defaultValue="basic">
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger className="flex items-center gap-2" value="basic">
              <PackageIcon className="h-4 w-4" />
              Información básica
            </TabsTrigger>
            <TabsTrigger className="flex items-center gap-2" value="options">
              <SettingsIcon className="h-4 w-4" />
              Opciones
            </TabsTrigger>
            <TabsTrigger className="flex items-center gap-2" value="variants">
              <PackageIcon className="h-4 w-4" />
              Variantes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="basic">
            <UpdateProductForm product={product} />
          </TabsContent>
          <TabsContent value="options">
            <UpdateProductOptionsForm product={product} />
          </TabsContent>
          <TabsContent value="variants">
            <ProductVariants product={product} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
