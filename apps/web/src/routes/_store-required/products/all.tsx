import { api } from '@cetus/api-client'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import { Checkbox } from '@cetus/ui/checkbox'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@cetus/ui/input-group'
import { Label } from '@cetus/ui/label'
import { Separator } from '@cetus/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@cetus/ui/sheet'
import { FrontStoreHeader } from '@cetus/web/components/front-store/front-store-header'
import { Skeleton } from '@cetus/web/components/ui/skeleton'
import { useCategories } from '@cetus/web/features/categories/hooks/use-categories'
import { FeaturedProductCard } from '@cetus/web/features/products/components/featured-product-card'
import { ProductGridSkeleton } from '@cetus/web/features/products/components/product-grid-skeleton'
import { productKeys } from '@cetus/web/features/products/queries'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useDebounce } from '@uidotdev/usehooks'
import { FilterIcon, Loader2, SearchXIcon, XIcon } from 'lucide-react'
import {
  createStandardSchemaV1,
  parseAsNativeArrayOf,
  parseAsString,
  useQueryStates,
} from 'nuqs'
import { type ReactNode, useEffect, useState } from 'react'

const searchParams = {
  searchTerm: parseAsString.withDefault(''),
  categoryIds: parseAsNativeArrayOf(parseAsString),
}

export const Route = createFileRoute('/_store-required/products/all')({
  component: RouteComponent,
  validateSearch: createStandardSchemaV1(searchParams, {
    partialOutput: true,
  }),
})

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useQueryStates(searchParams)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const { store } = useTenantStore()

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

  const clearFilters = () => {
    setSearchQuery({ searchTerm: '', categoryIds: null })
    setLocalSearchTerm('')
  }

  const activeFilterCount =
    (searchQuery.categoryIds?.length ?? 0) + (searchQuery.searchTerm ? 1 : 0)

  const allProducts = data?.pages.flatMap((page) => page.items) ?? []
  const totalCount = data?.pages[0]?.totalCount ?? 0

  const filterContent = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label className="font-medium text-sm">Buscar</Label>
        <InputGroup>
          <InputGroupInput
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            placeholder="Buscar productos..."
            value={localSearchTerm}
          />
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} />
          </InputGroupAddon>
        </InputGroup>
      </div>

      <Separator />

      {categories && categories.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium text-sm">Categorías</Label>
            {categories.length > 12 && (
              <span className="text-muted-foreground text-xs">
                {categories.length} categorías
              </span>
            )}
          </div>
          <div className="flex max-h-105 flex-col gap-1 overflow-y-auto">
            {categories.map((category) => (
              <Label
                className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md p-2 transition-colors hover:bg-muted"
                key={category.id}
              >
                <Checkbox
                  checked={
                    searchQuery.categoryIds?.includes(category.id) ?? false
                  }
                  onCheckedChange={() => handleCategoryToggle(category.id)}
                />
                <span className="text-sm">{category.name}</span>
              </Label>
            ))}
          </div>
        </div>
      )}

      {activeFilterCount > 0 && (
        <>
          <Separator />
          <Button className="w-full" onClick={clearFilters} variant="outline">
            <XIcon className="mr-2 size-4" />
            Limpiar filtros
          </Button>
        </>
      )}
    </div>
  )

  if (!store) {
    return null
  }

  if (isLoadingCategories) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <FrontStoreHeader
          hasCustomDomain={Boolean(store.customDomain)}
          store={store}
        />

        <main className="mx-auto w-full max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            <aside className="hidden w-64 shrink-0 lg:block">
              <div className="sticky top-24 flex flex-col gap-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-px w-full" />
                <Skeleton className="h-6 w-20" />
                <div className="flex flex-col gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton className="h-10 w-full" key={i} />
                  ))}
                </div>
              </div>
            </aside>

            <div className="flex-1">
              <div className="mb-6 flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-24 lg:hidden" />
              </div>
              <ProductGridSkeleton />
            </div>
          </div>
        </main>
      </div>
    )
  }

  let content: ReactNode

  if (isPending) {
    content = <ProductGridSkeleton />
  } else if (allProducts.length === 0) {
    content = (
      <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed bg-muted/30 p-8">
        <div className="rounded-full bg-muted p-4">
          <SearchXIcon className="size-12 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="font-bold text-xl">No se encontraron productos</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Intenta ajustar tu búsqueda o filtros.
          </p>
        </div>
        {activeFilterCount > 0 && (
          <Button onClick={clearFilters} variant="outline">
            <XIcon className="mr-2 size-4" />
            Limpiar filtros
          </Button>
        )}
      </div>
    )
  } else {
    content = (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {allProducts.map((product) => (
          <FeaturedProductCard
            key={`${product.id}-${product.variantId}-${product.slug}`}
            product={product}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FrontStoreHeader
        hasCustomDomain={Boolean(store.customDomain)}
        store={store}
      />

      <main className="mx-auto w-full max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24">
              <h3 className="mb-4 font-semibold text-lg">Filtros</h3>
              {filterContent}
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-balance font-bold text-3xl tracking-tight sm:text-4xl">
                  Todos nuestros productos
                </h2>
                {!isPending && (
                  <p className="mt-1 text-muted-foreground text-sm">
                    {totalCount} {totalCount === 1 ? 'producto' : 'productos'}{' '}
                    encontrados
                  </p>
                )}
              </div>

              <Sheet onOpenChange={setIsFilterOpen} open={isFilterOpen}>
                <SheetTrigger asChild>
                  <Button className="lg:hidden" variant="outline">
                    <FilterIcon className="mr-2 size-4" />
                    Filtros
                    {activeFilterCount > 0 && (
                      <Badge className="ml-2" variant="default">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto" side="left">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-4">{filterContent}</div>
                </SheetContent>
              </Sheet>
            </div>

            {activeFilterCount > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2 lg:hidden">
                {searchQuery.searchTerm && (
                  <Badge className="gap-1" variant="secondary">
                    Búsqueda: {searchQuery.searchTerm}
                    <button
                      className="ml-1 rounded-full hover:bg-background/50"
                      onClick={() => {
                        setSearchQuery((prev) => ({ ...prev, searchTerm: '' }))
                        setLocalSearchTerm('')
                      }}
                      type="button"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </Badge>
                )}
                {searchQuery.categoryIds?.map((categoryId) => {
                  const category = categories?.find((c) => c.id === categoryId)
                  return category ? (
                    <Badge
                      className="gap-1"
                      key={categoryId}
                      variant="secondary"
                    >
                      {category.name}
                      <button
                        className="ml-1 rounded-full hover:bg-background/50"
                        onClick={() => handleCategoryToggle(categoryId)}
                        type="button"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  ) : null
                })}
                <Button
                  className="h-5 px-2 text-xs"
                  onClick={clearFilters}
                  variant="ghost"
                >
                  Limpiar todo
                </Button>
              </div>
            )}

            {content}

            {hasNextPage && (
              <div className="mt-8 flex justify-center">
                <Button
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                  size="lg"
                  variant="outline"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    'Cargar más productos'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
