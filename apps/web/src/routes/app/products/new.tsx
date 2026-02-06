import { Tabs, TabsContent, TabsList, TabsTrigger } from '@cetus/ui/tabs'
import { ReturnButton } from '@cetus/web/components/return-button'
import { AdvancedProductRegistrationForm } from '@cetus/web/features/products/components/advanced-product-registration-form'
import { SimpleProductRegistrationForm } from '@cetus/web/features/products/components/simple-product-registration-form'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/products/new')({
  ssr: false,
  component: CreateProductPage,
})

function CreateProductPage() {
  return (
    <div className="flex flex-1 flex-col items-center p-4">
      <div className="w-full max-w-7xl space-y-3">
        <ReturnButton />

        <h1 className="font-heading font-medium text-lg">Registrar producto</h1>

        <Tabs defaultValue="simple">
          <TabsList>
            <TabsTrigger value="simple">Registro simple</TabsTrigger>
            <TabsTrigger value="advanced">Registro avanzado</TabsTrigger>
          </TabsList>

          <TabsContent value="simple">
            <SimpleProductRegistrationForm />
          </TabsContent>
          <TabsContent value="advanced">
            <AdvancedProductRegistrationForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
