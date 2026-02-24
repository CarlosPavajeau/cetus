import { api } from '@cetus/api-client'
import { getImageUrl } from '@cetus/shared/utils/image'
import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { FrontStoreHeader } from '@cetus/web/components/front-store/front-store-header'
import { FrontStoreSkeleton } from '@cetus/web/components/front-store/front-store-skeleton'
import { FeaturedProductsSection } from '@cetus/web/components/home/featured-products-section'
import { PopularProductsSection } from '@cetus/web/components/home/popular-products-section'
import { TrustBadgesSection } from '@cetus/web/components/home/trust-badges-section'
import { PageHeader } from '@cetus/web/components/page-header'
import { getAppUrl } from '@cetus/web/functions/get-app-url'
import { setStoreId } from '@cetus/web/functions/store-slug'
import { setupApiClient } from '@cetus/web/lib/api/setup'
import { generateHomepageSEO, generateSEOTags } from '@cetus/web/shared/seo'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { queryOptions } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useEffect } from 'react'

const storeBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ['store', slug],
    queryFn: () => api.stores.getBySlug(slug),
  })

const errorFallback = (
  <DefaultPageLayout>
    <PageHeader title="Hubo un problema al cargar los datos" />
  </DefaultPageLayout>
)

export const Route = createFileRoute('/$store')({
  beforeLoad: async () => {
    const appUrl = await getAppUrl()

    return {
      appUrl,
    }
  },
  loader: async ({ context, params }) => {
    const slug = params.store
    const store = await context.queryClient.ensureQueryData(
      storeBySlugQuery(slug),
    )

    if (!store) {
      throw notFound()
    }

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
      store,
      storeSlug: slug,
      appUrl: context.appUrl,
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData?.store) {
      return {
        meta: [
          { title: 'Tienda no encontrada' },
          {
            name: 'description',
            content: 'La tienda que buscas no está disponible.',
          },
          { name: 'robots', content: 'noindex, nofollow' },
        ],
      }
    }

    const { featuredProducts, popularProducts, categories, store, storeSlug } =
      loaderData

    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : `${loaderData.appUrl}/${storeSlug}`

    const seoConfig = generateHomepageSEO(
      store.name,
      baseUrl,
      featuredProducts,
      popularProducts,
      categories,
      store,
    )

    const seoTags = generateSEOTags(seoConfig)

    return {
      meta: [
        { title: seoConfig.title },
        ...seoTags,
        // Regional signals
        { name: 'geo.region', content: 'CO' },
        { name: 'geo.country', content: 'Colombia' },
        { name: 'language', content: 'es' },
        { name: 'author', content: store.name },
        // Mobile optimization
        { name: 'application-name', content: store.name },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: store.name },
      ],

      links: [
        { rel: 'canonical', href: baseUrl },
        // Preload first three featured images for LCP
        ...(featuredProducts?.slice(0, 3).map((product, index) => ({
          rel: 'preload',
          href: getImageUrl(product.imageUrl),
          as: 'image',
          key: `preload-store-featured-${index}`,
        })) || []),
        { rel: 'alternate', hrefLang: 'es-CO', href: baseUrl },
        { rel: 'alternate', hrefLang: 'es', href: baseUrl },
        {
          rel: 'sitemap',
          type: 'application/xml',
          href: `${baseUrl}/sitemap.xml`,
        },
      ],

      scripts:
        seoConfig.structuredData?.map((data, index) => ({
          type: 'application/ld+json',
          children: JSON.stringify(data),
          key: `json-ld-store-${index}`,
        })) || [],
    }
  },
  component: RouteComponent,
  pendingComponent: FrontStoreSkeleton,
})

function RouteComponent() {
  const { featuredProducts, popularProducts, categories, store } =
    Route.useLoaderData()

  const { actions } = useTenantStore()
  useEffect(() => {
    if (!store) {
      return
    }

    actions.setStore(store)
  }, [actions, store])

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
