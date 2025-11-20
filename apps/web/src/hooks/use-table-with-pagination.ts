import { usePagination } from '@/hooks/use-pagination'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants'
import {
  type ColumnDef,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'

export function useTableWithPagination<T = unknown>(
  columns: ColumnDef<T>[],
  data: T[],
) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const table = useReactTable<T>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
  })

  const paginationInfo = usePagination({
    currentPage: table.getState().pagination.pageIndex + 1,
    totalPages: table.getPageCount(),
    paginationItemsToDisplay: DEFAULT_PAGE_SIZE,
  })

  return {
    table,
    paginationInfo,
  }
}
