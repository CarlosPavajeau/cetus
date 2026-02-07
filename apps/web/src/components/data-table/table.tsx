import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cetus/ui/table'
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
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
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
              data-state={row.getIsSelected() && 'selected'}
              key={row.id}
              onClick={() => {
                if (onRowClick) {
                  onRowClick(row.original)
                }
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
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
