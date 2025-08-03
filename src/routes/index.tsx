import { fetchCategories } from '@/api/categories'
import { fetchFeaturedProducts, fetchPopularProducts } from '@/api/products'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { ApplicationHome } from '@/components/home/application-home'
import { FeaturedProductsSection } from '@/components/home/featured-products-section'
import { HeroSection } from '@/components/home/hero-section'
import { HomeSkeleton } from '@/components/home/home-sekeleton'
import { PopularProductsSection } from '@/components/home/popular-products-section'
import { PageHeader } from '@/components/page-header'
import { getServerhost } from '@/server/get-host'
import { useTenantStore } from '@/store/use-tenant-store'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  ssr: false,
  loader: async () => {
    const { host, isAppUrl } = await getServerhost()
    const { fetchAndSetStore, clearStore } = useTenantStore.getState().actions

    if (isAppUrl) {
      clearStore()

      return {
        isAppUrl,
      }
    }

    try {
      const { store } = useTenantStore.getState()

      await fetchAndSetStore(host)

      if (!store) {
        return {
          isAppUrl,
        }
      }

      const [featuredProducts, popularProducts, categories] = await Promise.all(
        [fetchFeaturedProducts(), fetchPopularProducts(), fetchCategories()],
      )

      return {
        featuredProducts,
        popularProducts,
        categories,
        isAppUrl,
      }
    } catch (err) {
      return {
        isAppUrl,
      }
    }
  },
  component: IndexPage,
  pendingComponent: HomeSkeleton,
})

function IndexPage() {
  const { featuredProducts, popularProducts, categories, isAppUrl } =
    Route.useLoaderData()

  if (isAppUrl) {
    return (
      <DefaultPageLayout>
        <ApplicationHome />
      </DefaultPageLayout>
    )
  }

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
