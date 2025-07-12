import { fetchCategories } from '@/api/categories'
import { fetchProductsForSale } from '@/api/products'
import { fetchStoreBySlug } from '@/api/stores'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { FilterSection } from '@/components/home/filter-section'
import { FilterSectionSkeleton } from '@/components/home/filter-section-skeleton'
import { PageHeader } from '@/components/page-header'
import { ProductGrid } from '@/components/product/product-grid'
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton'
import { useAppStore } from '@/store/app'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

export const Route = createFileRoute('/$store')({
  loader: async (context) => {
    const slug = context.params.store
    const store = await fetchStoreBySlug(slug)

    const [products, categories] = await Promise.all([
      fetchProductsForSale(store.slug),
      fetchCategories(store.slug)
    ])

    return {
      store,
      products,
      categories,
    }
  },
  component: RouteComponent,
  pendingComponent: () => {
    return (
      <DefaultPageLayout>
        <FilterSectionSkeleton />
        <ProductGridSkeleton />
      </DefaultPageLayout>
    )
  },
})

function RouteComponent() {
  const { store, products, categories } = Route.useLoaderData()
  const appStore = useAppStore()

  useEffect(() => {
    appStore.setCurrentStore(store)
  }, [])

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

  if (!categories || !products) {
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
