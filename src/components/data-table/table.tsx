import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { flexRender, type useReactTable } from '@tanstack/react-table'

type Props<T = unknown> = {
  table: ReturnType<typeof useReactTable<T>>

  onRowClick?: (row: T) => void
}

export function DataTable<T = unknown>({
  table,
  onRowClick,
}: Readonly<Props<T>>) {
  return (
    <Table className="table-fixed border-separate border-spacing-0 [&_tr:not(:last-child)_td]:border-b">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow
            className="border-0 hover:bg-transparent"
            key={headerGroup.id}
          >
            {headerGroup.headers.map((header) => (
              <TableHead
                className="relative h-9 select-none border-border border-y bg-muted first:rounded-l-lg first:border-l last:rounded-r-lg last:border-r"
                key={header.id}
                style={{ width: `${header.getSize()}px` }}
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
              className="h-px border-0 hover:bg-accent/50 [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
              data-state={row.getIsSelected() && 'selected'}
              key={row.id}
              onClick={() => {
                if (onRowClick) {
                  onRowClick(row.original)
                }
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell className="h-[inherit] last:py-0" key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              className="h-24 text-center"
              colSpan={table.getAllColumns().length}
            >
              Sin resultados.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
