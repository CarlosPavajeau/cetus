import { CreateDeliveryFeeDialog } from '@cetus/web/features/orders/components/create-delivery-fee.dialog'
import { DeliveryFeesTable } from '@cetus/web/features/orders/components/delivery-fees-table'
import { useDeliveryFees } from '@cetus/web/features/orders/hooks/use-delivery-fees'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/delivery-fees')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isLoading } = useDeliveryFees()

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading font-semibold text-2xl">Costos de envío</h1>

        <CreateDeliveryFeeDialog />
      </div>

      <DeliveryFeesTable deliveryFees={data} isLoading={isLoading} />
    </div>
  )
}
