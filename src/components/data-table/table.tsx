import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/shared/cn'
import { flexRender, type useReactTable } from '@tanstack/react-table'

type Props<T = unknown> = {
  table: ReturnType<typeof useReactTable<T>>

  onRowClick?: (row: T) => void
}

export function DataTable<T = unknown>({ table, onRowClick }: Props<T>) {
  return (
    <Table className="border-separate border-spacing-0 px-6 [&_tr_td]:border-border [&_tr_td]:border-b">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow
            key={headerGroup.id}
            className="border-0 hover:bg-transparent"
          >
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                style={{ width: `${header.getSize()}px` }}
                className="relative h-8 select-none border-0 bg-muted font-normal first:rounded-l-lg last:rounded-r-lg"
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>

      <TableBody>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && 'selected'}
              className={cn(
                'hover:bg-transparent',
                onRowClick && 'cursor-pointer',
              )}
              onClick={() => {
                if (onRowClick) {
                  onRowClick(row.original)
                }
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="last:py-0">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={table.getAllColumns().length}
              className="h-24 text-center"
            >
              Sin resultados.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
