import { DefaultLoader } from '@/components/default-loader'
import { UpdateProductForm } from '@/components/product/update-product-form'
import { UpdateProductOptionsForm } from '@/components/product/update-product-options-form'
import { ReturnButton } from '@/components/return-button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { productQuery } from '@/hooks/products/use-product'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { PackageIcon, SettingsIcon, TagIcon } from 'lucide-react'

export const Route = createFileRoute('/app/products/$id/details')({
  ssr: false,
  loader: async ({ params, context }) => {
    const { id } = params

    const product = await context.queryClient.ensureQueryData(productQuery(id))

    return product
  },
  component: RouteComponent,
  pendingComponent: DefaultLoader,
})

function RouteComponent() {
  const { id } = Route.useParams()
  const { data: product } = useSuspenseQuery(productQuery(id))

  return (
    <div className="mx-auto max-w-7xl space-y-3">
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

            <CardContent>{product.slug}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
