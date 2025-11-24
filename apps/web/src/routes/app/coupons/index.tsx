import { Button } from '@cetus/ui/button'
import { CouponsTable } from '@cetus/web/features/coupons/components/coupons-table'
import { useCoupons } from '@cetus/web/features/coupons/hooks/use-coupons'
import { createFileRoute, Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'

export const Route = createFileRoute('/app/coupons/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isLoading } = useCoupons()

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading font-semibold text-2xl">Cupones</h1>

        <Button asChild>
          <Link to="/app/coupons/new">
            <PlusIcon />
            Crear cupón
          </Link>
        </Button>
      </div>

      <CouponsTable coupons={data} isLoading={isLoading} />
    </div>
  )
}
