import { ListFilterIcon } from 'lucide-react'
import { memo } from 'react'
import { ORDER_STATUS_OPTIONS, type OrderStatus } from '@/api/orders'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'

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
                  ORDER_STATUS_OPTIONS.filter((option) =>
                    statuses.includes(option.value),
                  ).map((option) => (
                    <Badge
                      className="rounded-sm px-1 font-normal"
                      key={option.value}
                      variant="secondary"
                    >
                      {option.label}
                    </Badge>
                  ))
                )}
              </div>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {ORDER_STATUS_OPTIONS.map((option) => (
          <DropdownMenuCheckboxItem
            checked={statuses.includes(option.value)}
            className="capitalize"
            key={option.value}
            onCheckedChange={() => onStatusToggle(option.value)}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ),
)
