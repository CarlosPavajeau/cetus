import { fetchProductOptionTypes, type ProductOptionType } from '@/api/products'
import { TablePagination } from '@/components/data-table/pagination'
import { DataTable } from '@/components/data-table/table'
import { DefaultLoader } from '@/components/default-loader'
import { CreateProductOptionTypeSheet } from '@/components/product/create-product-option-type-sheet'
import { useTableWithPagination } from '@/hooks/use-table-with-pagination'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

const productOptionTypesQuery = queryOptions({
  queryKey: ['product-option-types'],
  queryFn: fetchProductOptionTypes,
})

export const Route = createFileRoute('/app/product-option-types')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(productOptionTypesQuery)
  },
  component: RouteComponent,
  pendingComponent: DefaultLoader,
})

const columns: ColumnDef<ProductOptionType>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: 'Nombre',
  },
  {
    id: 'values',
    header: 'Opciones',
    cell: ({ row }) => {
      const options = row.original.values
      const valueToDisplay = options.map((option) => option.value).join(', ')

      return <span>{valueToDisplay}</span>
    },
  },
]

function RouteComponent() {
  const { data } = useSuspenseQuery(productOptionTypesQuery)
  const { table, paginationInfo } = useTableWithPagination(columns, data)

  const context = Route.useRouteContext()

  const handleSuccess = () => {
    context.queryClient.invalidateQueries(productOptionTypesQuery)
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-heading font-semibold text-2xl">
          Tipos de opciones de producto
        </h1>

        <CreateProductOptionTypeSheet onSuccess={handleSuccess} />
      </div>

      <div className="grid gap-4 overflow-hidden">
        <DataTable table={table} />
        <TablePagination paginationInfo={paginationInfo} table={table} />
      </div>
    </>
  )
}
