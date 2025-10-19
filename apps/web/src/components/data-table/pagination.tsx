import type { useReactTable } from '@tanstack/react-table'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { usePagination } from '@/hooks/use-pagination'

type Props<T = unknown> = {
  table: ReturnType<typeof useReactTable<T>>
  paginationInfo: ReturnType<typeof usePagination>
}

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50]

export function TablePagination<T = unknown>({
  table,
  paginationInfo,
}: Readonly<Props<T>>) {
  const { pages, showLeftEllipsis, showRightEllipsis } = paginationInfo

  return (
    <div className="flex items-center justify-between gap-3 max-sm:flex-col">
      {/* Page number information */}
      <p
        aria-live="polite"
        className="flex-1 whitespace-nowrap text-muted-foreground text-sm"
      >
        Página{' '}
        <span className="text-foreground">
          {table.getState().pagination.pageIndex + 1}
        </span>{' '}
        de <span className="text-foreground">{table.getPageCount()}</span>
      </p>

      {/* Pagination buttons */}
      <div className="grow">
        <Pagination>
          <PaginationContent>
            {/* Previous page button */}
            <PaginationItem>
              <Button
                aria-label="Go to previous page"
                className="disabled:pointer-events-none disabled:opacity-50"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                size="icon"
                variant="outline"
              >
                <ChevronLeftIcon aria-hidden="true" size={16} />
              </Button>
            </PaginationItem>

            {/* Left ellipsis (...) */}
            {showLeftEllipsis && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {/* Page number buttons */}
            {pages.map((page) => {
              const isActive =
                page === table.getState().pagination.pageIndex + 1
              return (
                <PaginationItem key={page}>
                  <Button
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => table.setPageIndex(page - 1)}
                    size="icon"
                    variant={isActive ? 'outline' : 'ghost'}
                  >
                    {page}
                  </Button>
                </PaginationItem>
              )
            })}

            {/* Right ellipsis (...) */}
            {showRightEllipsis && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {/* Next page button */}
            <PaginationItem>
              <Button
                aria-label="Go to next page"
                className="disabled:pointer-events-none disabled:opacity-50"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                size="icon"
                variant="outline"
              >
                <ChevronRightIcon aria-hidden="true" size={16} />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Results per page */}
      <div className="flex flex-1 justify-end">
        <Select
          aria-label="Results per page"
          onValueChange={(value) => {
            table.setPageSize(Number(value))
          }}
          value={table.getState().pagination.pageSize.toString()}
        >
          <SelectTrigger
            className="w-fit whitespace-nowrap"
            id="results-per-page"
          >
            <SelectValue placeholder="Select number of results" />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((pageSize) => (
              <SelectItem key={pageSize} value={pageSize.toString()}>
                {pageSize} / página
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
