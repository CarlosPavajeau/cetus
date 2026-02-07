import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@cetus/ui/pagination'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cetus/ui/select'
import type { usePagination } from '@cetus/web/hooks/use-pagination'
import type { useReactTable } from '@tanstack/react-table'
import { Field, FieldLabel } from '../ui/field'

type Props<T = unknown> = {
  table: ReturnType<typeof useReactTable<T>>
  paginationInfo?: ReturnType<typeof usePagination>
}

export function TablePagination<T = unknown>({ table }: Readonly<Props<T>>) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Field className="w-fit" orientation="horizontal">
        <FieldLabel htmlFor="select-rows-per-page">
          Elementos por página
        </FieldLabel>
        <Select
          defaultValue="10"
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger className="w-20" id="select-rows-per-page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem onClick={table.previousPage}>
            <PaginationPrevious
              aria-disabled={!table.getCanPreviousPage()}
              className={
                table.getCanPreviousPage()
                  ? ''
                  : 'pointer-events-none opacity-50'
              }
              href="#"
              onClick={(e) => {
                e.preventDefault()
                if (table.getCanPreviousPage()) {
                  table.previousPage()
                }
              }}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              aria-disabled={!table.getCanNextPage()}
              className={
                table.getCanNextPage() ? '' : 'pointer-events-none opacity-50'
              }
              href="#"
              onClick={(e) => {
                e.preventDefault()
                if (table.getCanNextPage()) {
                  table.nextPage()
                }
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
