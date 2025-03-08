import { AccessDenied } from '@/components/access-denied'
import { CompleteOrdersChart } from '@/components/complete-orders-chart'
import { NewOrdersSummary } from '@/components/new-orders-summary'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Protect } from '@clerk/clerk-react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-bold font-heading text-2xl text-foreground">
            Panel de control
          </h1>

          <div>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Enero</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden">
          <div className="*:-ms-px *:-mt-px -m-px grid auto-rows-min @2xl:grid-cols-2">
            <CompleteOrdersChart />

            <NewOrdersSummary />
          </div>
        </div>
      </div>
    </Protect>
  )
}
