import { fetchCategories } from '@/api/categories'
import { fetchFeaturedProducts, fetchPopularProducts } from '@/api/products'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { FeaturedProductsSection } from '@/components/home/featured-products-section'
import { HeroSection } from '@/components/home/hero-section'
import { HomeSkeleton } from '@/components/home/home-sekeleton'
import { PopularProductsSection } from '@/components/home/popular-products-section'
import { NotFound } from '@/components/not-found'
import { PageHeader } from '@/components/page-header'
import { getServerhost } from '@/server/get-host'
import { useTenantStore } from '@/store/use-tenant-store'
import { createFileRoute, notFound } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  ssr: false,
  loader: async () => {
    try {
      const { host } = await getServerhost()
      const { store } = useTenantStore.getState()
      const { fetchAndSetStore } = useTenantStore.getState().actions

      await fetchAndSetStore(host)

      if (!store) {
        throw notFound()
      }

      const [featuredProducts, popularProducts, categories] = await Promise.all(
        [fetchFeaturedProducts(), fetchPopularProducts(), fetchCategories()],
      )

      return {
        featuredProducts,
        popularProducts,
        categories,
      }
    } catch (err) {
      throw notFound()
    }
  },
  component: IndexPage,
  pendingComponent: HomeSkeleton,
  notFoundComponent: () => {
    return <NotFound />
  },
})

function IndexPage() {
  const { featuredProducts, popularProducts, categories } =
    Route.useLoaderData()

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
