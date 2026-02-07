import { Tabs, TabsContent, TabsList, TabsTrigger } from '@cetus/ui/tabs'
import { ReturnButton } from '@cetus/web/components/return-button'
import { Button } from '@cetus/web/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@cetus/web/components/ui/tooltip'
import { AdvancedProductRegistrationForm } from '@cetus/web/features/products/components/advanced-product-registration-form'
import { SimpleProductRegistrationForm } from '@cetus/web/features/products/components/simple-product-registration-form'
import {
  InformationCircleIcon,
  Settings01Icon,
  ZapIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
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

        <Tabs className="gap-3" defaultValue="simple">
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="simple">
                <HugeiconsIcon icon={ZapIcon} />
                Registro simple
              </TabsTrigger>
              <TabsTrigger value="advanced">
                <HugeiconsIcon icon={Settings01Icon} />
                Registro avanzado
              </TabsTrigger>
            </TabsList>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon-sm" variant="ghost">
                  <HugeiconsIcon icon={InformationCircleIcon} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Usa el registro avanzado para registrar productos que tengan
                variantes o múltiples opciones.
              </TooltipContent>
            </Tooltip>
          </div>

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
