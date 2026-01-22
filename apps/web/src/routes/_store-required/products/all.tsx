import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { FilterSection } from '@cetus/web/components/home/filter-section'
import { FilterSectionSkeleton } from '@cetus/web/components/home/filter-section-skeleton'
import { useCategories } from '@cetus/web/features/categories/hooks/use-categories'
import { ProductGrid } from '@cetus/web/features/products/components/product-grid'
import { ProductGridSkeleton } from '@cetus/web/features/products/components/product-grid-skeleton'
import { productQueries } from '@cetus/web/features/products/queries'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useDeferredValue, useMemo, useState } from 'react'

export const Route = createFileRoute('/_store-required/products/all')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: categories, isLoading: isLoadingCategories } = useCategories()
  const { data: products, isLoading: isLoadingProducts } = useQuery(
    productQueries.forSale,
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Defer expensive filtering operations to prevent blocking user input
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const deferredSelectedCategories = useDeferredValue(selectedCategories)

  const filteredProducts = useMemo(() => {
    if (!products) {
      return []
    }

    return products.items.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(deferredSearchTerm.toLowerCase())
      const matchesCategory =
        deferredSelectedCategories.length === 0 ||
        deferredSelectedCategories.includes(product.categoryId)

      return matchesSearch && matchesCategory
    })
  }, [deferredSearchTerm, deferredSelectedCategories, products])

  if (isLoadingCategories || isLoadingProducts) {
    return (
      <DefaultPageLayout>
        <FilterSectionSkeleton />

        <ProductGridSkeleton />
      </DefaultPageLayout>
    )
  }

  if (!products || products.items.length === 0 || !categories) {
    return (
      <DefaultPageLayout>
        <p className="w-full text-left font-heading font-medium text-2xl">
          No hay productos disponibles
        </p>
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout>
      <div className="flex flex-col items-center gap-4">
        <p className="w-full text-left font-heading font-medium text-2xl">
          Todos nuestros productos
        </p>

        <FilterSection
          categories={categories}
          searchTerm={searchTerm}
          selectedCategories={selectedCategories}
          setSearchTerm={setSearchTerm}
          setSelectedCategories={setSelectedCategories}
        />

        <ProductGrid products={filteredProducts} />
      </div>
    </DefaultPageLayout>
  )
}
