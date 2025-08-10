import { Button } from '@/components/ui/button'
import { RefreshCwIcon } from 'lucide-react'
import { memo } from 'react'

export const OrdersHeader = memo(({ onRefresh }: { onRefresh: () => void }) => (
  <div className="mb-6 flex items-center justify-between">
    <h1 className="font-heading font-semibold text-2xl">Pedidos</h1>
    <Button onClick={onRefresh} variant="outline">
      <RefreshCwIcon
        aria-hidden="true"
        className="-ms-1 opacity-60"
        size={16}
      />
      Recargar
    </Button>
  </div>
))
