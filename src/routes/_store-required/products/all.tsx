import { DefaultPageLayout } from '@/components/default-page-layout'
import { FilterSection } from '@/components/home/filter-section'
import { FilterSectionSkeleton } from '@/components/home/filter-section-skeleton'
import { ProductGrid } from '@/components/product/product-grid'
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton'
import { useCategories } from '@/hooks/categories'
import { useProductsForSale } from '@/hooks/products'
import { createFileRoute } from '@tanstack/react-router'
import { useDeferredValue, useMemo, useState } from 'react'

export const Route = createFileRoute('/_store-required/products/all')({
  component: RouteComponent,
})

function RouteComponent() {
  const { categories, isLoading: isLoadingCategories } = useCategories()
  const { products, isLoading: isLoadingProducts } = useProductsForSale()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Defer expensive filtering operations to prevent blocking user input
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const deferredSelectedCategories = useDeferredValue(selectedCategories)

  const filteredProducts = useMemo(() => {
    if (!products) {
      return []
    }

    return products.filter((product) => {
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

  if (!products || products.length === 0 || !categories) {
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
