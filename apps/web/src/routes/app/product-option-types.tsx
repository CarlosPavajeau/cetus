import type { ProductOptionType } from '@cetus/api-client/types/products'
import { TablePagination } from '@cetus/web/components/data-table/pagination'
import { DataTable } from '@cetus/web/components/data-table/table'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { CreateProductOptionTypeSheet } from '@cetus/web/features/products/components/create-product-option-type-sheet'
import { productQueries } from '@cetus/web/features/products/queries'
import { useTableWithPagination } from '@cetus/web/hooks/use-table-with-pagination'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/app/product-option-types')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(productQueries.optionTypes.list())
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
  const { data } = useSuspenseQuery(productQueries.optionTypes.list())
  const { table, paginationInfo } = useTableWithPagination(columns, data)

  const context = Route.useRouteContext()

  const handleSuccess = () => {
    context.queryClient.invalidateQueries(productQueries.optionTypes.list())
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
