import { api } from '@cetus/api-client'
import type {
  CustomerQueryParams,
  CustomerSortBy,
} from '@cetus/api-client/types/customers'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { Button } from '@cetus/web/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@cetus/web/components/ui/dropdown-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@cetus/web/components/ui/input-group'
import { CustomersTable } from '@cetus/web/features/customers/components/customers-table'
import { Search01Icon, Sorting04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { PaginationState } from '@tanstack/react-table'
import { useDebounce } from '@uidotdev/usehooks'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/app/customers/')({
  component: RouteComponent,
})

const sortByLabels: Record<CustomerSortBy, string> = {
  name: 'nombre',
  last_purchase: 'última compra',
  total_spent: 'total gastado',
}

function RouteComponent() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sortBy, setSortBy] = useState<CustomerSortBy>('total_spent')
  const [rawSearchTerm, setRawSearchTerm] = useState<string>('')
  const searchTerm = useDebounce(rawSearchTerm, 300)

  const queryParams: CustomerQueryParams = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: searchTerm ?? undefined,
    sortBy,
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset pagination when search or sort changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [searchTerm, sortBy])

  const { data, isLoading } = useQuery({
    queryKey: ['customers', queryParams],
    queryFn: () => api.customers.list(queryParams),
  })

  const pageCount = data?.totalPages ?? 0

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <div>
          <h1 className="font-heading font-medium text-xl">Clientes</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="max-w-xs">
            <InputGroupInput
              onChange={(e) => setRawSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o teléfono"
              value={rawSearchTerm}
            />
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} />
            </InputGroupAddon>
          </InputGroup>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <HugeiconsIcon data-icon="inline-start" icon={Sorting04Icon} />
                Ordenar por {sortByLabels[sortBy]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onSelect={() => setSortBy('total_spent')}>
                Total gastado
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSortBy('name')}>
                Nombre
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSortBy('last_purchase')}>
                Última compra
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading && <DefaultLoader />}

      {!isLoading && (
        <CustomersTable
          data={data?.items}
          onPaginationChange={setPagination}
          pageCount={pageCount}
          pagination={pagination}
        />
      )}
    </div>
  )
}
