import { fetchCategories } from '@/api/categories'
import { fetchFeaturedProducts, fetchPopularProducts } from '@/api/products'
import { fetchStoreByDomain } from '@/api/stores'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { ApplicationHome } from '@/components/home/application-home'
import { FeaturedProductsSection } from '@/components/home/featured-products-section'
import { HeroSection } from '@/components/home/hero-section'
import { HomeSkeleton } from '@/components/home/home-sekeleton'
import { PopularProductsSection } from '@/components/home/popular-products-section'
import { PageHeader } from '@/components/page-header'
import { getServerhost } from '@/server/get-host'
import { env } from '@/shared/env'
import { generateHomepageSEO, generateSEOTags } from '@/shared/seo'
import { useTenantStore } from '@/store/use-tenant-store'
import { queryOptions } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

const storeByDomainQuery = (domain: string) =>
  queryOptions({
    queryKey: ['store', domain],
    queryFn: () => fetchStoreByDomain(domain),
  })

export const Route = createFileRoute('/')({
  loader: async ({ context }) => {
    const { host, isAppUrl } = await getServerhost()

    if (isAppUrl) {
      return {
        isAppUrl,
      }
    }

    const store = await context.queryClient.ensureQueryData(
      storeByDomainQuery(host),
    )

    const [featuredProducts, popularProducts, categories] = await Promise.all([
      fetchFeaturedProducts(store.slug),
      fetchPopularProducts(store.slug),
      fetchCategories(store.slug),
    ])

    return {
      featuredProducts,
      popularProducts,
      categories,
      isAppUrl,
      store,
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData || loaderData.isAppUrl) {
      return {
        meta: [
          {
            name: 'description',
            content:
              'Cetus es una plataforma moderna de e-commerce para crear y gestionar tu tienda online.',
          },
          {
            name: 'keywords',
            content:
              'cetus, ecommerce, plataforma, tienda online, crear tienda',
          },
        ],
      }
    }

    const { featuredProducts, popularProducts, categories, store } = loaderData

    if (!store) {
      return {}
    }

    const baseUrl =
      typeof window !== 'undefined' ? window.location.origin : env.APP_URL // fallback URL

    // Generate comprehensive homepage SEO configuration
    const seoConfig = generateHomepageSEO(
      store.name,
      baseUrl,
      featuredProducts,
      popularProducts,
      categories,
    )

    const seoTags = generateSEOTags(seoConfig)

    return {
      meta: [
        // Essential SEO meta tags
        ...seoTags,

        // Page title
        { title: seoConfig.title, content: seoConfig.title },

        // Homepage-specific meta tags
        { name: 'geo.region', content: 'CO' },
        { name: 'geo.country', content: 'Colombia' },
        { name: 'language', content: 'es' },
        { name: 'author', content: store.name },
        { name: 'publisher', content: store.name },

        // Business-specific meta
        { name: 'category', content: 'E-commerce' },
        { name: 'coverage', content: 'Colombia' },
        { name: 'distribution', content: 'Global' },
        { name: 'rating', content: 'General' },

        // Mobile optimization
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: store.name },

        // Additional e-commerce meta
        {
          name: 'product-count',
          content: (
            (featuredProducts?.length || 0) + (popularProducts?.length || 0)
          ).toString(),
        },
        { name: 'store-type', content: 'online' },
        { name: 'commerce-engine', content: 'cetus' },
      ].filter((tag) => tag.content), // Remove empty content tags

      links: [
        // Canonical URL
        { rel: 'canonical', href: seoConfig.canonicalUrl },

        // Preload featured product images for better performance
        ...(featuredProducts?.slice(0, 3).map((product, index) => ({
          rel: 'preload',
          href: product.imageUrl,
          as: 'image',
          key: `preload-featured-${index}`,
        })) || []),

        // Alternative language versions (if applicable)
        { rel: 'alternate', hrefLang: 'es-CO', href: baseUrl },
        { rel: 'alternate', hrefLang: 'es', href: baseUrl },

        // Sitemap reference
        {
          rel: 'sitemap',
          type: 'application/xml',
          href: `${baseUrl}/sitemap.xml`,
        },

        // RSS feed (if applicable)
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          title: `${store.name} - Productos`,
          href: `${baseUrl}/feed.xml`,
        },
      ],

      // Add structured data scripts
      scripts:
        seoConfig.structuredData?.map((data, index) => ({
          type: 'application/ld+json',
          children: JSON.stringify(data, null, 2),
          key: `json-ld-homepage-${index}`,
        })) || [],
    }
  },
  component: IndexPage,
  pendingComponent: HomeSkeleton,
})

function IndexPage() {
  const { featuredProducts, popularProducts, categories, isAppUrl, store } =
    Route.useLoaderData()

  const { actions } = useTenantStore()
  useEffect(() => {
    if (!store) {
      return
    }

    actions.setStore(store)
  }, [actions, store])

  if (isAppUrl) {
    return (
      <DefaultPageLayout>
        <ApplicationHome />
      </DefaultPageLayout>
    )
  }

  if (!(categories && featuredProducts && popularProducts)) {
    return (
      <DefaultPageLayout>
        <PageHeader title="Hubo un problema al cargar los datos" />
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout>
      <main>
        <section aria-labelledby="hero-heading">
          <HeroSection />
        </section>

        <section aria-labelledby="featured-products-heading">
          <h2 className="sr-only" id="featured-products-heading">
            Productos Destacados en {store?.name}
          </h2>
          <FeaturedProductsSection products={featuredProducts} />
        </section>

        <section aria-labelledby="popular-products-heading">
          <h2 className="sr-only" id="popular-products-heading">
            Productos Populares en {store?.name}
          </h2>
          <PopularProductsSection products={popularProducts} />
        </section>

        <div className="sr-only">
          <h1>{store?.name} - Tu Tienda Online de Confianza</h1>
          <p>
            Bienvenido a {store?.name}, tu destino para compras online en
            Colombia. Descubre nuestra amplia selección de productos de alta
            calidad con
            {featuredProducts.length > 0 &&
              ` ${featuredProducts.length} productos destacados`}
            {popularProducts.length > 0 &&
              ` y ${popularProducts.length} productos populares`}
            .
            {categories.length > 0 &&
              ` Explora nuestras categorías: ${categories.map((cat) => cat.name).join(', ')}.`}
            Envío rápido a toda Colombia y los mejores precios garantizados.
          </p>
          <div>
            <span>Tienda: {store?.name}</span>
            <span>Categorías disponibles: {categories.length}</span>
            <span>Productos destacados: {featuredProducts.length}</span>
            <span>Productos populares: {popularProducts.length}</span>
            <span>País: Colombia</span>
            <span>Idioma: Español</span>
            <span>Moneda: Peso Colombiano (COP)</span>
          </div>
        </div>
      </main>
    </DefaultPageLayout>
  )
}
