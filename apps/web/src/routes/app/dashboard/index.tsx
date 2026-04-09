import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@cetus/web/components/ui/tabs'
import { ProductsRanking } from '@cetus/web/features/reports/components/products-ranking'
import { ProfitabilityReport } from '@cetus/web/features/reports/components/profitability-report'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="space-y-4 p-4">
      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">Rentabilidad mensual</TabsTrigger>
          <TabsTrigger value="products">Ranking de productos</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly">
          <ProfitabilityReport />
        </TabsContent>

        <TabsContent value="products">
          <ProductsRanking />
        </TabsContent>
      </Tabs>
    </div>
  )
}
