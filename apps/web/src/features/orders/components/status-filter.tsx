import type { OrderStatus } from '@cetus/api-client/types/orders'
import { orderStatusLabels } from '@cetus/shared/constants/order'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@cetus/ui/dropdown-menu'
import { Separator } from '@cetus/ui/separator'
import { ListFilterIcon } from 'lucide-react'
import { memo } from 'react'

export const StatusFilter = memo(
  ({
    statuses,
    onStatusToggle,
  }: {
    statuses: OrderStatus[]
    onStatusToggle: (status: OrderStatus) => void
  }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2" variant="outline">
          <ListFilterIcon aria-hidden="true" size={16} />
          Estado
          {statuses.length > 0 && (
            <>
              <Separator className="mx-2 h-4" orientation="vertical" />
              <Badge
                className="rounded-sm px-1 font-normal lg:hidden"
                variant="secondary"
              >
                {statuses.length}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {statuses.length > 2 ? (
                  <Badge
                    className="rounded-sm px-1 font-normal"
                    variant="secondary"
                  >
                    {statuses.length} seleccionados
                  </Badge>
                ) : (
                  Object.entries(orderStatusLabels)
                    .filter(([key]) => statuses.includes(key as OrderStatus))
                    .map(([key, label]) => (
                      <Badge
                        className="rounded-sm px-1 font-normal"
                        key={key}
                        variant="secondary"
                      >
                        {label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {Object.entries(orderStatusLabels).map(([key, label]) => (
          <DropdownMenuCheckboxItem
            checked={statuses.includes(key as OrderStatus)}
            className="capitalize"
            key={key}
            onCheckedChange={() => onStatusToggle(key as OrderStatus)}
          >
            {label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ),
)
