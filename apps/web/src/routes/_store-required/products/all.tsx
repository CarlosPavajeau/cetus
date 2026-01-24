import { api } from '@cetus/api-client'
import { Button } from '@cetus/ui/button'
import { Input } from '@cetus/ui/input'
import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { useCategories } from '@cetus/web/features/categories/hooks/use-categories'
import { ProductGrid } from '@cetus/web/features/products/components/product-grid'
import { ProductGridSkeleton } from '@cetus/web/features/products/components/product-grid-skeleton'
import { productKeys } from '@cetus/web/features/products/queries'
import { useInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useDebounce } from '@uidotdev/usehooks'
import { Loader2, SearchIcon, SearchXIcon } from 'lucide-react'
import {
  createStandardSchemaV1,
  parseAsIndex,
  parseAsNativeArrayOf,
  parseAsString,
  useQueryStates,
} from 'nuqs'
import { type ReactNode, useEffect, useState } from 'react'

const searchParams = {
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
  const { data, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: [...productKeys.lists(), 'for-sale', searchQuery],
      queryFn: ({ pageParam }) => {
        return api.products.listForSale({
          ...searchQuery,
          page: pageParam as number,
        })
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) => {
        if (!lastPage.totalPages) {
          return undefined
        }
        const nextPage = allPages.length + 1
        return nextPage <= lastPage.totalPages ? nextPage : undefined
      },
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
    }))
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

  const allProducts = data?.pages.flatMap((page) => page.items) ?? []

  let content: ReactNode

  if (allProducts.length === 0) {
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
    content = <ProductGrid products={allProducts} />
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
                        ? 'default'
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

        {hasNextPage && (
          <div className="flex justify-center py-6">
            <Button
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
              variant="link"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cargando...
                </>
              ) : (
                'Cargar más productos'
              )}
            </Button>
          </div>
        )}
      </div>
    </DefaultPageLayout>
  )
}
