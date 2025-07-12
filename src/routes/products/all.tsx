import { DefaultPageLayout } from '@/components/default-page-layout'
import { FilterSection } from '@/components/home/filter-section'
import { FilterSectionSkeleton } from '@/components/home/filter-section-skeleton'
import { ProductGrid } from '@/components/product/product-grid'
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton'
import { useCategories } from '@/hooks/categories'
import { useProductsForSale } from '@/hooks/products'
import { useAppStore } from '@/store/app'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/products/all')({
  component: RouteComponent,
})

function RouteComponent() {
  const { currentStore } = useAppStore()
  const { categories, isLoading: isLoadingCategories } = useCategories(
    currentStore?.slug,
  )
  const { products, isLoading: isLoadingProducts } = useProductsForSale(
    currentStore?.slug,
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const filteredProducts = useMemo(() => {
    if (!products) return []

    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(product.categoryId)

      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategories, products])

  if (!currentStore) {
    return <Navigate to="/" />
  }

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
      <DefaultPageLayout store={currentStore}>
        <p className="w-full text-left font-heading font-medium text-2xl">
          No hay productos disponibles
        </p>
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout store={currentStore}>
      <div className="flex flex-col items-center gap-4">
        <p className="w-full text-left font-heading font-medium text-2xl">
          Todos nuestros productos
        </p>

        <FilterSection
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          categories={categories}
        />

        <ProductGrid products={filteredProducts} />
      </div>
    </DefaultPageLayout>
  )
}
