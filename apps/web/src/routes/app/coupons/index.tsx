import { Button } from '@cetus/ui/button'
import { Skeleton } from '@cetus/ui/skeleton'
import { CouponsTable } from '@cetus/web/features/coupons/components/coupons-table'
import { useCoupons } from '@cetus/web/features/coupons/hooks/use-coupons'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/app/coupons/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isLoading } = useCoupons()

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <h1 className="font-heading font-semibold text-xl">Cupones</h1>

        <Button asChild>
          <Link to="/app/coupons/new">Agregar cupón</Link>
        </Button>
      </div>

      {isLoading && <Skeleton className="h-10 w-full" />}

      {!isLoading && <CouponsTable coupons={data} />}
    </div>
  )
}
