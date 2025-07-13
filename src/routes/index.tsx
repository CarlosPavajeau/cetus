import { fetchCategories } from '@/api/categories'
import { fetchFeaturedProducts, fetchPopularProducts } from '@/api/products'
import { fetchStoreByDomain } from '@/api/stores'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { FeaturedProductsSection } from '@/components/home/featured-products-section'
import { HeroSection } from '@/components/home/hero-section'
import { HomeSkeleton } from '@/components/home/home-sekeleton'
import { PopularProductsSection } from '@/components/home/popular-products-section'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { getServerhost } from '@/server/get-host'
import { useAppStore } from '@/store/app'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/')({
  loader: async () => {
    const { host } = await getServerhost()
    const store = await fetchStoreByDomain(host)

    const [featuredProducts, popularProducts, categories] = await Promise.all([
      fetchFeaturedProducts(store.slug),
      fetchPopularProducts(store.slug),
      fetchCategories(store.slug),
    ])

    return {
      store,
      featuredProducts,
      popularProducts,
      categories,
    }
  },
  component: IndexPage,
  pendingComponent: HomeSkeleton,
  notFoundComponent: () => {
    return <NotFound />
  },
})

function IndexPage() {
  const { store, featuredProducts, popularProducts, categories } =
    Route.useLoaderData()

  const appStore = useAppStore()

  useEffect(() => {
    appStore.setCurrentStore(store)
  }, [])

  if (!categories || !featuredProducts || !popularProducts) {
    return (
      <DefaultPageLayout>
        <PageHeader title="Hubo un problema al cargar los datos" />
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout>
      <HeroSection />

      <FeaturedProductsSection products={featuredProducts} />

      <PopularProductsSection products={popularProducts} />
    </DefaultPageLayout>
  )
}
