import { DefaultPageLayout } from '@/components/default-page-layout'
import { FilterSection } from '@/components/home/filter-section'
import { FilterSectionSkeleton } from '@/components/home/filter-section-skeleton'
import { ProductGrid } from '@/components/product/product-grid'
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton'
import { useCategories } from '@/hooks/categories'
import { useProductsForSale } from '@/hooks/products'
import { useTenantStore } from '@/store/use-tenant-store'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/products/all')({
  beforeLoad: () => {
    const { store } = useTenantStore.getState()

    if (!store) {
      throw redirect({
        to: '/',
        search: {
          redirectReason: 'NO_STORE_SELECTED',
        },
      })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { categories, isLoading: isLoadingCategories } = useCategories()
  const { products, isLoading: isLoadingProducts } = useProductsForSale()

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
