import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@cetus/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cetus/ui/select'
import { usePagination } from '@cetus/web/hooks/use-pagination'
import { memo } from 'react'

type OrdersPaginationProps = {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

const PAGE_SIZE_OPTIONS = [10, 25, 50]

export const OrdersPagination = memo(
  ({
    page,
    pageSize,
    totalCount,
    totalPages,
    onPageChange,
    onPageSizeChange,
  }: OrdersPaginationProps) => {
    const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
      currentPage: page,
      totalPages,
      paginationItemsToDisplay: 5,
    })

    return (
      <div className="flex flex-col items-center gap-3 max-sm:gap-2 sm:flex-row sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Página {page} de {totalPages}
          <span className="ml-2 text-muted-foreground/70">
            ({totalCount} pedidos)
          </span>
        </p>

        <Pagination className="w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={page <= 1}
                className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page > 1) {
                    onPageChange(page - 1)
                  }
                }}
              />
            </PaginationItem>

            {showLeftEllipsis && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {pages.map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  isActive={p === page}
                  onClick={(e) => {
                    e.preventDefault()
                    onPageChange(p)
                  }}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}

            {showRightEllipsis && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext
                aria-disabled={page >= totalPages}
                className={
                  page >= totalPages ? 'pointer-events-none opacity-50' : ''
                }
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (page < totalPages) {
                    onPageChange(page + 1)
                  }
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>

        <Select
          onValueChange={(v) => onPageSizeChange(Number(v))}
          value={String(pageSize)}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}/pagina
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  },
)
