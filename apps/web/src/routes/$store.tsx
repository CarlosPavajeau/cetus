import { api } from '@cetus/api-client'
import { env } from '@cetus/env/server'
import { getImageUrl } from '@cetus/shared/utils/image'
import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { FeaturedProductsSection } from '@cetus/web/components/home/featured-products-section'
import { HeroSection } from '@cetus/web/components/home/hero-section'
import { HomeSkeleton } from '@cetus/web/components/home/home-sekeleton'
import { PopularProductsSection } from '@cetus/web/components/home/popular-products-section'
import { PageHeader } from '@cetus/web/components/page-header'
import { setStoreSlug } from '@cetus/web/functions/store-slug'
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

export const Route = createFileRoute('/$store')({
  ssr: false,
  loader: async ({ context, params }) => {
    const slug = params.store
    const store = await context.queryClient.ensureQueryData(
      storeBySlugQuery(slug),
    )

    if (!store) {
      throw notFound()
    }

    await setStoreSlug({
      data: {
        slug: store.slug,
      },
    })

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
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData?.store) {
      return {
        title: 'Tienda no encontrada',
        meta: [
          {
            name: 'description',
            content: 'La tienda que buscas no está disponible.',
          },
          {
            name: 'robots',
            content: 'noindex, nofollow',
          },
        ],
      }
    }

    const { featuredProducts, popularProducts, categories, store, storeSlug } =
      loaderData

    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : `${env.APP_URL}/${storeSlug}` // Store-specific URL

    // Generate comprehensive store homepage SEO configuration
    const seoConfig = generateHomepageSEO(
      store.name,
      baseUrl, // Use store-specific URL
      featuredProducts,
      popularProducts,
      categories,
    )

    // Customize title for store-specific page
    const storeSpecificTitle = `${store.name}`

    // Customize description for store-specific page
    const storeSpecificDescription = `Descubre ${store.name}, tu tienda online especializada. ${
      (featuredProducts?.length || 0) + (popularProducts?.length || 0) > 0
        ? `Más de ${(featuredProducts?.length || 0) + (popularProducts?.length || 0)} productos`
        : 'Productos exclusivos'
    }${
      categories?.length
        ? ` en ${categories
            .slice(0, 3)
            .map((cat) => cat.name)
            .join(', ')}`
        : ''
    }. Envío rápido y garantía.`

    const seoTags = generateSEOTags({
      ...seoConfig,
      title: storeSpecificTitle,
      description: storeSpecificDescription,
      canonicalUrl: baseUrl,
      ogTitle: storeSpecificTitle,
      ogDescription: storeSpecificDescription,
      ogUrl: baseUrl,
      twitterTitle: storeSpecificTitle,
      twitterDescription: storeSpecificDescription,
    })

    return {
      meta: [
        // Essential SEO meta tags
        ...seoTags,

        // Page title
        { title: seoConfig.title, content: seoConfig.title },

        // Store-specific meta tags
        { name: 'store-name', content: store.name },
        { name: 'store-slug', content: storeSlug },
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

        // Store branding
        { name: 'application-name', content: store.name },
        { name: 'apple-mobile-web-app-title', content: store.name },
        { name: 'theme-color', content: '#ffffff' },

        // Mobile optimization
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },

        // Store-specific e-commerce meta
        {
          name: 'product-count',
          content: (
            (featuredProducts?.length || 0) + (popularProducts?.length || 0)
          ).toString(),
        },
        { name: 'store-type', content: 'specialized' },
        { name: 'commerce-engine', content: 'cetus' },
      ].filter((tag) => tag.content), // Remove empty content tags

      links: [
        // Canonical URL for store
        { rel: 'canonical', href: baseUrl },

        // Preload featured product images for better performance
        ...(featuredProducts?.slice(0, 3).map((product, index) => ({
          rel: 'preload',
          href: getImageUrl(product.imageUrl),
          as: 'image',
          key: `preload-store-featured-${index}`,
        })) || []),

        // Alternative language versions
        { rel: 'alternate', hrefLang: 'es-CO', href: baseUrl },
        { rel: 'alternate', hrefLang: 'es', href: baseUrl },

        // Store-specific sitemap
        {
          rel: 'sitemap',
          type: 'application/xml',
          href: `${baseUrl}/sitemap.xml`,
        },

        // Store RSS feed
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          title: `${store.name} - Productos`,
          href: `${baseUrl}/feed.xml`,
        },

        // Favicon and touch icons (store-specific if available)
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],

      // Add structured data scripts with store-specific data
      scripts:
        seoConfig.structuredData?.map((data, index) => ({
          type: 'application/ld+json',
          children: JSON.stringify(data, null, 2),
          key: `json-ld-store-${index}`,
        })) || [],
    }
  },
  component: RouteComponent,
  pendingComponent: HomeSkeleton,
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
    return (
      <DefaultPageLayout>
        <PageHeader title="Hubo un problema al cargar los datos" />
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout>
      <main>
        <section aria-labelledby="store-hero-heading">
          <h1 className="sr-only" id="store-hero-heading">
            Bienvenido a {store?.name} - Tu Tienda Online Especializada
          </h1>
          <HeroSection />
        </section>

        <section aria-labelledby="store-featured-products-heading">
          <h2 className="sr-only" id="store-featured-products-heading">
            Productos Destacados en {store?.name}
          </h2>
          <FeaturedProductsSection products={featuredProducts} />
        </section>

        <section aria-labelledby="store-popular-products-heading">
          <h2 className="sr-only" id="store-popular-products-heading">
            Productos Más Populares en {store?.name}
          </h2>
          <PopularProductsSection products={popularProducts} />
        </section>

        <div className="sr-only">
          <div itemScope itemType="https://schema.org/Store">
            <h1 itemProp="name">{store?.name} - Tienda Online Especializada</h1>
            <p itemProp="description">
              Descubre {store?.name}, tu tienda online de confianza
              especializada en productos de calidad. Ofrecemos una cuidadosa
              selección de productos con
              {featuredProducts.length > 0 &&
                ` ${featuredProducts.length} productos destacados`}
              {popularProducts.length > 0 &&
                ` y ${popularProducts.length} productos populares`}
              .
              {categories.length > 0 &&
                ` Explora nuestras categorías especializadas: ${categories.map((cat) => cat.name).join(', ')}.`}
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
              {categories.length > 0 &&
                ` Nos especializamos en: ${categories.map((cat) => cat.name).join(', ')}.`}
            </p>
          </div>
        </div>
      </main>
    </DefaultPageLayout>
  )
}
