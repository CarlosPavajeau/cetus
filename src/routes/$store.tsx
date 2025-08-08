import { fetchCategories } from '@/api/categories'
import { fetchFeaturedProducts, fetchPopularProducts } from '@/api/products'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { FeaturedProductsSection } from '@/components/home/featured-products-section'
import { HeroSection } from '@/components/home/hero-section'
import { HomeSkeleton } from '@/components/home/home-sekeleton'
import { PopularProductsSection } from '@/components/home/popular-products-section'
import { PageHeader } from '@/components/page-header'
import { env } from '@/shared/env'
import { generateHomepageSEO, generateSEOTags } from '@/shared/seo'
import { useTenantStore } from '@/store/use-tenant-store'
import { createFileRoute, notFound } from '@tanstack/react-router'

export const Route = createFileRoute('/$store')({
  ssr: false,
  loader: async (context) => {
    const slug = context.params.store
    const { fetchAndSetStore } = useTenantStore.getState().actions

    const result = await fetchAndSetStore(slug)

    if (!result) {
      throw notFound()
    }

    const [featuredProducts, popularProducts, categories] = await Promise.all([
      fetchFeaturedProducts(),
      fetchPopularProducts(),
      fetchCategories(),
    ])

    // Get the current store after it's been set
    const { store } = useTenantStore.getState()

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

    const storeUrl = `${baseUrl}/${storeSlug}`

    // Generate comprehensive store homepage SEO configuration
    const seoConfig = generateHomepageSEO(
      store.name,
      storeUrl, // Use store-specific URL
      featuredProducts,
      popularProducts,
      categories,
    )

    // Customize title for store-specific page
    const storeSpecificTitle = `${store.name} - Tienda Online | Productos de Calidad`

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
      canonicalUrl: storeUrl,
      ogTitle: storeSpecificTitle,
      ogDescription: storeSpecificDescription,
      ogUrl: storeUrl,
      twitterTitle: storeSpecificTitle,
      twitterDescription: storeSpecificDescription,
    })

    return {
      title: storeSpecificTitle,
      meta: [
        // Essential SEO meta tags
        ...seoTags,

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
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
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
        { rel: 'canonical', href: storeUrl },

        // Preload featured product images for better performance
        ...(featuredProducts?.slice(0, 3).map((product, index) => ({
          rel: 'preload',
          href: product.imageUrl,
          as: 'image',
          key: `preload-store-featured-${index}`,
        })) || []),

        // Alternative language versions
        { rel: 'alternate', hreflang: 'es-CO', href: storeUrl },
        { rel: 'alternate', hreflang: 'es', href: storeUrl },

        // Store-specific sitemap
        {
          rel: 'sitemap',
          type: 'application/xml',
          href: `${storeUrl}/sitemap.xml`,
        },

        // Store RSS feed
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          title: `${store.name} - Productos`,
          href: `${storeUrl}/feed.xml`,
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
