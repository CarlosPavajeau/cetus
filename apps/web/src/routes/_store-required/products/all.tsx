import { Button } from '@cetus/ui/button'
import { Input } from '@cetus/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@cetus/ui/pagination'
import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { useCategories } from '@cetus/web/features/categories/hooks/use-categories'
import { ProductGrid } from '@cetus/web/features/products/components/product-grid'
import { ProductGridSkeleton } from '@cetus/web/features/products/components/product-grid-skeleton'
import { productQueries } from '@cetus/web/features/products/queries'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useDebounce } from '@uidotdev/usehooks'
import { SearchIcon, SearchXIcon } from 'lucide-react'
import {
  createStandardSchemaV1,
  parseAsIndex,
  parseAsNativeArrayOf,
  parseAsString,
  useQueryStates,
} from 'nuqs'
import { type ReactNode, useEffect, useState } from 'react'

const searchParams = {
  page: parseAsIndex.withDefault(1),
  pageSize: parseAsIndex.withDefault(20),
  searchTerm: parseAsString.withDefault(''),
  categoryIds: parseAsNativeArrayOf(parseAsString),
}

export const Route = createFileRoute('/_store-required/products/all')({
  component: RouteComponent,
  validateSearch: createStandardSchemaV1(searchParams),
})

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useQueryStates(searchParams)

  const { data: categories, isLoading: isLoadingCategories } = useCategories()
  const {
    data: products,
    isPending,
    isFetching,
  } = useQuery({
    ...productQueries.forSale(searchQuery),
    placeholderData: keepPreviousData,
  })

  const [localSearchTerm, setLocalSearchTerm] = useState(searchQuery.searchTerm)
  const debouncedSearchTerm = useDebounce(localSearchTerm, 400)

  useEffect(() => {
    if (debouncedSearchTerm !== searchQuery.searchTerm) {
      setSearchQuery((prev) => ({ ...prev, searchTerm: debouncedSearchTerm }))
    }
  }, [debouncedSearchTerm, searchQuery.searchTerm, setSearchQuery])

  const handleCategoryToggle = (categoryId: string) => {
    const categoryIds = searchQuery.categoryIds ?? []
    const newCategoryIds = categoryIds.includes(categoryId)
      ? categoryIds.filter((id) => id !== categoryId)
      : [...categoryIds, categoryId]

    setSearchQuery((prev) => ({
      ...prev,
      categoryIds: newCategoryIds,
      page: 1,
    }))
  }

  const handlePageChange = (newPage: number) => {
    setSearchQuery((prev) => ({ ...prev, page: newPage }))
  }

  if (isPending || isLoadingCategories) {
    return (
      <DefaultPageLayout>
        <div className="flex w-full flex-col items-center gap-4">
          <p className="w-full text-left font-heading font-medium text-2xl">
            Todos nuestros productos
          </p>
          <div className="h-10 w-full" />
          <div className="h-9 w-full" />
        </div>
        <ProductGridSkeleton />
      </DefaultPageLayout>
    )
  }

  const pageCount = products?.totalPages ?? 1

  let content: ReactNode

  if (isFetching) {
    content = <ProductGridSkeleton />
  } else if (!products || products.items.length === 0) {
    content = (
      <div className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed">
        <SearchXIcon className="size-16 text-muted-foreground" />
        <div className="text-center">
          <h2 className="font-bold font-heading text-2xl">
            No se encontraron productos
          </h2>
          <p className="text-muted-foreground">
            Intenta ajustar tu búsqueda o filtros.
          </p>
        </div>
      </div>
    )
  } else {
    content = <ProductGrid products={products.items} />
  }

  return (
    <DefaultPageLayout>
      <div className="flex flex-col items-center gap-4">
        <p className="w-full text-left font-heading font-medium text-2xl">
          Todos nuestros productos
        </p>

        <div className="flex w-full flex-col gap-4">
          <div className="relative w-full">
            <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              placeholder="Buscar productos..."
              value={localSearchTerm}
            />
          </div>

          {categories && categories.length > 0 && (
            <div className="relative w-full">
              <div className="scrollbar-hide flex w-full gap-2 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <Button
                    className="shrink-0"
                    key={category.id}
                    onClick={() => handleCategoryToggle(category.id)}
                    size="xs"
                    variant={
                      searchQuery.categoryIds?.includes(category.id)
                        ? 'primary'
                        : 'outline'
                    }
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {content}

        {pageCount > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  className={
                    searchQuery.page <= 1
                      ? 'pointer-events-none opacity-50'
                      : ''
                  }
                  onClick={() => handlePageChange(searchQuery.page - 1)}
                />
              </PaginationItem>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map(
                (page) => (
                  <PaginationItem key={page}>
                    <Button
                      onClick={() => handlePageChange(page)}
                      size="icon"
                      variant={page === searchQuery.page ? 'primary' : 'ghost'}
                    >
                      {page}
                    </Button>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  className={
                    searchQuery.page >= pageCount
                      ? 'pointer-events-none opacity-50'
                      : ''
                  }
                  onClick={() => handlePageChange(searchQuery.page + 1)}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </DefaultPageLayout>
  )
}
