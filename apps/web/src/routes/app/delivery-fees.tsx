import { Skeleton } from '@cetus/ui/skeleton'
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
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <h1 className="font-heading font-semibold text-xl">Costos de envío</h1>

        <CreateDeliveryFeeDialog />
      </div>

      {isLoading && <Skeleton className="h-10 w-full" />}
      {!isLoading && <DeliveryFeesTable deliveryFees={data} />}
    </div>
  )
}
