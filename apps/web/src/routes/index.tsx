import { api } from '@cetus/api-client'
import { getImageUrl } from '@cetus/shared/utils/image'
import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { FrontStoreHeader } from '@cetus/web/components/front-store/front-store-header'
import { FrontStoreSkeleton } from '@cetus/web/components/front-store/front-store-skeleton'
import { FeaturedProductsSection } from '@cetus/web/components/home/featured-products-section'
import { LandingPage } from '@cetus/web/components/home/landing-page'
import { PopularProductsSection } from '@cetus/web/components/home/popular-products-section'
import { TrustBadgesSection } from '@cetus/web/components/home/trust-badges-section'
import { PageHeader } from '@cetus/web/components/page-header'
import { getAppUrl } from '@cetus/web/functions/get-app-url'
import { getServerhost } from '@cetus/web/functions/get-host'
import { setStoreId } from '@cetus/web/functions/store-slug'
import { setupApiClient } from '@cetus/web/lib/api/setup'
import { generateHomepageSEO, generateSEOTags } from '@cetus/web/shared/seo'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { queryOptions } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

const storeByDomainQuery = (domain: string) =>
  queryOptions({
    queryKey: ['store', domain],
    queryFn: () => api.stores.getByDomain(domain),
  })

const errorFallback = (
  <DefaultPageLayout>
    <PageHeader title="Hubo un problema al cargar los datos" />
  </DefaultPageLayout>
)

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

    // Fire-and-forget: cookie is for subsequent requests, not needed for current fetch
    setStoreId({
      data: {
        id: store.id,
      },
    })

    setupApiClient(store.id)

    const [featuredProducts, popularProducts, categories] = await Promise.all([
      api.products.listFeatured(),
      api.products.listPopular(),
      api.categories.list(),
    ])

    return {
      featuredProducts,
      popularProducts,
      categories,
      isAppUrl,
      store,
    }
  },
  head: async ({ loaderData }) => {
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

    const appUrl = await getAppUrl()
    const baseUrl =
      typeof window !== 'undefined' ? window.location.origin : appUrl // fallback URL

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
          href: getImageUrl(product.imageUrl),
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
          children: JSON.stringify(data),
          key: `json-ld-homepage-${index}`,
        })) || [],
    }
  },
  component: IndexPage,
  pendingComponent: FrontStoreSkeleton,
})

function IndexPage() {
  const { featuredProducts, popularProducts, categories, isAppUrl, store } =
    Route.useLoaderData()

  const setStore = useTenantStore((state) => state.actions.setStore)
  const clearStore = useTenantStore((state) => state.actions.clearStore)
  useEffect(() => {
    if (!store) {
      return
    }

    setStore(store)
  }, [setStore, store])

  useEffect(() => {
    if (isAppUrl) {
      clearStore()
    }
  }, [isAppUrl, clearStore])

  if (isAppUrl) {
    return <LandingPage />
  }

  if (!(categories && featuredProducts && popularProducts)) {
    return errorFallback
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FrontStoreHeader
        hasCustomDomain={Boolean(store.customDomain)}
        store={store}
      />
      <main className="mx-auto w-full max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:px-8">
        <section aria-labelledby="store-featured-products-heading">
          <h2 className="sr-only" id="store-featured-products-heading">
            Productos destacados en {store?.name}
          </h2>
          <FeaturedProductsSection products={featuredProducts} />
        </section>

        <section aria-labelledby="store-popular-products-heading">
          <h2 className="sr-only" id="store-popular-products-heading">
            Productos más populares en {store?.name}
          </h2>
          <PopularProductsSection products={popularProducts} />
        </section>

        <section aria-labelledby="store-trust-badges-heading">
          <h2 className="sr-only" id="store-trust-badges-heading">
            Por qué comprar en {store?.name}
          </h2>
          <TrustBadgesSection />
        </section>

        <div className="sr-only">
          <div itemScope itemType="https://schema.org/Store">
            <h1 itemProp="name">{store?.name} - Tienda Online Especializada</h1>
            <p itemProp="description">
              Descubre {store?.name}, tu tienda online de confianza
              especializada en productos de calidad. Ofrecemos una cuidadosa
              selección de productos con
              {featuredProducts.length > 0
                ? ` ${featuredProducts.length} productos destacados`
                : null}
              {popularProducts.length > 0
                ? ` y ${popularProducts.length} productos populares`
                : null}
              .
              {categories.length > 0
                ? ` Explora nuestras categorías especializadas: ${categories.map((cat) => cat.name).join(', ')}.`
                : null}
              Envío rápido a toda Colombia, atención personalizada y garantía de
              satisfacción.
            </p>
            <div>
              <span itemProp="name">Tienda: {store?.name}</span>
              <span>Especialidades: {categories.length} categorías</span>
              <span>Productos destacados: {featuredProducts.length}</span>
              <span>Productos populares: {popularProducts.length}</span>
              <span itemProp="addressCountry">País: Colombia</span>
              <span>Idioma: Español</span>
              <span itemProp="currenciesAccepted">
                Moneda: Peso Colombiano (COP)
              </span>
              <span>Tipo de tienda: Especializada</span>
              <span>Plataforma: Cetus E-commerce</span>
            </div>
          </div>

          <div>
            <h3>¿Por qué elegir {store?.name}?</h3>
            <ul>
              <li>Productos de alta calidad seleccionados cuidadosamente</li>
              <li>Envío rápido y seguro a toda Colombia</li>
              <li>Atención al cliente personalizada</li>
              <li>Precios competitivos y ofertas exclusivas</li>
              <li>Garantía de satisfacción en todos nuestros productos</li>
              <li>Plataforma segura para compras online</li>
            </ul>
          </div>

          <div>
            <h3>Información de la tienda</h3>
            <p>
              {store?.name} es una tienda online especializada que forma parte
              de la plataforma Cetus E-commerce. Nos dedicamos a ofrecer
              productos de calidad con un servicio excepcional.
              {categories.length > 0
                ? ` Nos especializamos en: ${categories.map((cat) => cat.name).join(', ')}.`
                : null}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
