import { fetchCategories } from '@/api/categories'
import { fetchProductsForSale } from '@/api/products'
import { fetchStoreByDomain } from '@/api/stores'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { FilterSection } from '@/components/home/filter-section'
import { FilterSectionSkeleton } from '@/components/home/filter-section-skeleton'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { ProductGrid } from '@/components/product/product-grid'
import { ProductGridSkeleton } from '@/components/product/product-grid-skeleton'
import { createFileRoute } from '@tanstack/react-router'
import { getHeader, getHeaders } from '@tanstack/react-start/server'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/')({
  loader: async () => {
    const domain = getHeader('Host')

    console.log('[INFO]: Request headers')
    console.log(getHeaders())

    const store = await fetchStoreByDomain(domain!)

    const products = await fetchProductsForSale(store.slug)
    const categories = await fetchCategories(store.slug)

    return {
      products,
      categories,
    }
  },
  component: IndexPage,
  pendingComponent: () => {
    return (
      <DefaultPageLayout>
        <FilterSectionSkeleton />
        <ProductGridSkeleton />
      </DefaultPageLayout>
    )
  },
  notFoundComponent: () => {
    return <NotFound />
  },
})

function IndexPage() {
  const { products, categories } = Route.useLoaderData()

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
