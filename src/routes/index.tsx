import { DefaultPageLayout } from '@/components/default-page-layout'
import { FilterSection } from '@/components/home/filter-section'
import { FilterSectionSkeleton } from '@/components/home/filter-section-skeleton'
import { PageHeader } from '@/components/page-header'
import { ProductGrid } from '@/components/product/product-grid'
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton'
import { useCategories } from '@/hooks/categories'
import { useProductsForSale } from '@/hooks/products'
import { useStoreByDomain } from '@/hooks/stores'
import { useAppStore } from '@/store/app'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const { store, isLoading: isLoadingStore } = useStoreByDomain(
    window.location.hostname,
  )
  const appStore = useAppStore()

  const { products, isLoading } = useProductsForSale()
  const { categories, isLoading: isLoadingCategories } = useCategories()
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

  useEffect(() => {
    if (isLoadingStore) return

    if (!store) return

    appStore.setCurrentStore(store)
  }, [store, isLoadingStore])

  if (isLoadingCategories || isLoading) {
    return (
      <DefaultPageLayout>
        <FilterSectionSkeleton />
        <ProductGridSkeleton />
      </DefaultPageLayout>
    )
  }

  if (!products || !categories) {
    return (
      <DefaultPageLayout>
        <PageHeader title="Hubo un problema al cargar los datos" />
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout>
      <FilterSection
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        categories={categories}
      />

      <ProductGrid products={filteredProducts} />
    </DefaultPageLayout>
  )
}
