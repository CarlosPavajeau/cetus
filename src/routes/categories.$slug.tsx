import { fetchCategoryBySlug } from '@/api/categories'
import { fetchProductsByCategory } from '@/api/products'
import { fetchStoreById } from '@/api/stores'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { ProductGrid } from '@/components/product/product-grid'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { getImageUrl } from '@/shared/cdn'
import { env } from '@/shared/env'
import { generateCategorySEO, generateSEOTags } from '@/shared/seo'
import { useTenantStore } from '@/store/use-tenant-store'
import { queryOptions } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { HomeIcon } from 'lucide-react'
import { useEffect } from 'react'

const categoryBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ['category', slug],
    queryFn: () => fetchCategoryBySlug(slug),
  })

export const Route = createFileRoute('/categories/$slug')({
  loader: async ({ context, params }) => {
    const slug = params.slug
    const category = await context.queryClient.ensureQueryData(
      categoryBySlugQuery(slug),
    )

    if (!category) {
      throw notFound()
    }

    const [store, products] = await Promise.all([
      fetchStoreById(category.storeId),
      fetchProductsByCategory(category.id),
    ])

    return {
      category,
      store,
      products,
      categorySlug: slug,
    }
  },
  head: ({ loaderData }) => {
    if (!(loaderData?.store && loaderData?.category)) {
      return {
        title: 'Categoría no encontrada',
        meta: [
          {
            name: 'description',
            content: 'La categoría que buscas no está disponible.',
          },
          {
            name: 'robots',
            content: 'noindex, nofollow',
          },
        ],
      }
    }

    const { category, store, products, categorySlug } = loaderData

    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : `${env.APP_URL}/${store.slug}` // Store-specific URL

    const categoryUrl = `${baseUrl}/categories/${categorySlug}`

    // Generate comprehensive category SEO configuration
    const seoConfig = generateCategorySEO(
      category,
      store.name,
      baseUrl,
      products,
    )

    // Customize title for category page
    const categorySpecificTitle = `${category.name} | ${store.name}`

    // Customize description for category page
    const categorySpecificDescription = `Descubre ${category.name} en ${store.name}. ${
      products?.length > 0
        ? `${products.length} productos disponibles`
        : 'Productos de calidad'
    } con los mejores precios y envío rápido a toda Colombia.`

    const seoTags = generateSEOTags({
      ...seoConfig,
      title: categorySpecificTitle,
      description: categorySpecificDescription,
      canonicalUrl: categoryUrl,
      ogTitle: categorySpecificTitle,
      ogDescription: categorySpecificDescription,
      ogUrl: categoryUrl,
      twitterTitle: categorySpecificTitle,
      twitterDescription: categorySpecificDescription,
    })

    return {
      meta: [
        // Essential SEO meta tags
        ...seoTags,

        // Page title
        { title: seoConfig.title, content: seoConfig.title },

        // Category-specific meta tags
        { name: 'category-name', content: category.name },
        { name: 'category-slug', content: categorySlug },
        { name: 'store-name', content: store.name },
        { name: 'store-id', content: store.id },
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

        // Category-specific e-commerce meta
        {
          name: 'product-count',
          content: (products?.length || 0).toString(),
        },
        { name: 'category-type', content: 'product-listing' },
        { name: 'commerce-engine', content: 'cetus' },
      ].filter((tag) => tag.content), // Remove empty content tags

      links: [
        // Canonical URL for category
        { rel: 'canonical', href: categoryUrl },

        // Preload product images for better performance
        ...(products?.slice(0, 3).map((product, index) => ({
          rel: 'preload',
          href: getImageUrl(product.imageUrl),
          as: 'image',
          key: `preload-category-product-${index}`,
        })) || []),

        // Alternative language versions
        { rel: 'alternate', hrefLang: 'es-CO', href: categoryUrl },
        { rel: 'alternate', hrefLang: 'es', href: categoryUrl },

        // Store-specific sitemap
        {
          rel: 'sitemap',
          type: 'application/xml',
          href: `${baseUrl}/sitemap.xml`,
        },

        // Category RSS feed
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          title: `${category.name} - ${store.name}`,
          href: `${baseUrl}/categories/${categorySlug}/feed.xml`,
        },

        // Favicon and touch icons
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },

        // Prefetch next/prev pages for pagination (if applicable)
        // This could be enhanced with actual pagination logic
      ],

      // Add structured data scripts with category-specific data
      scripts:
        seoConfig.structuredData?.map((data, index) => ({
          type: 'application/ld+json',
          children: JSON.stringify(data, null, 2),
          key: `json-ld-category-${index}`,
        })) || [],
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { category, store, products } = Route.useLoaderData()

  const { actions } = useTenantStore()
  useEffect(() => {
    if (!store) {
      return
    }

    actions.setStore(store)
  }, [actions, store])

  if (!(category && store && products)) {
    return (
      <DefaultPageLayout>
        <main>
          <h1>Hubo un problema al cargar los datos de la categoría</h1>
        </main>
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout>
      <main className="flex flex-col gap-6">
        <section aria-labelledby="category-hero-heading">
          <h1 className="sr-only" id="category-hero-heading">
            {category.name} en {store.name} - Productos de Calidad
          </h1>

          <nav aria-label="Breadcrumb">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="text-xs">
                  <Link aria-label="Ir al inicio" to="/">
                    <HomeIcon aria-hidden="true" size={12} />
                    <span className="sr-only">Inicio</span>
                  </Link>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem className="text-xs">
                  <BreadcrumbPage>{category.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </nav>
        </section>

        <section aria-labelledby="category-products-heading">
          <h2 className="sr-only" id="category-products-heading">
            Productos en {category.name}
            {products.length > 0 &&
              ` - ${products.length} productos disponibles`}
          </h2>

          <div className="flex flex-col items-center gap-4">
            <ProductGrid products={products} />
          </div>
        </section>

        <div className="sr-only">
          <div itemScope itemType="https://schema.org/CollectionPage">
            <h1 itemProp="name">
              {category.name} - {store.name}
            </h1>
            <p itemProp="description">
              Explora {category.name} en {store.name}, tu tienda online de
              confianza.
              {products.length > 0
                ? `Descubre ${products.length} productos de alta calidad`
                : 'Productos de alta calidad'}{' '}
              con los mejores precios y envío rápido a toda Colombia. Encuentra
              exactamente lo que buscas en nuestra selección especializada.
            </p>
            <div>
              <span itemProp="name">Categoría: {category.name}</span>
              <span>Tienda: {store.name}</span>
              <span>Productos disponibles: {products.length}</span>
              <span itemProp="addressCountry">País: Colombia</span>
              <span>Idioma: Español</span>
              <span itemProp="currenciesAccepted">
                Moneda: Peso Colombiano (COP)
              </span>
              <span>Tipo de página: Listado de productos</span>
              <span>Plataforma: Cetus E-commerce</span>
            </div>
          </div>

          <div>
            <h3>
              ¿Por qué elegir {category.name} en {store.name}?
            </h3>
            <ul>
              <li>Productos de {category.name} cuidadosamente seleccionados</li>
              <li>Precios competitivos y ofertas exclusivas</li>
              <li>Envío rápido y seguro a toda Colombia</li>
              <li>Atención al cliente personalizada</li>
              <li>Garantía de satisfacción en todos nuestros productos</li>
              <li>Plataforma segura para compras online</li>
              {products.length > 0 && (
                <li>
                  {products.length} productos disponibles en esta categoría
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3>Información de la categoría</h3>
            <p>
              {category.name} es una de las categorías especializadas de{' '}
              {store.name}, donde encontrarás productos cuidadosamente
              seleccionados para satisfacer tus necesidades. Forma parte de la
              plataforma Cetus E-commerce, garantizando calidad y confianza en
              cada compra.
              {products.length > 0 &&
                ` Actualmente contamos con ${products.length} productos en esta categoría.`}
            </p>
          </div>

          <div>
            <h3>Productos destacados en {category.name}</h3>
            {products.length > 0 ? (
              <ul>
                {products.slice(0, 5).map((product) => (
                  <li key={product.id}>
                    {product.name} - ${product.price?.toLocaleString()} COP
                    {product.rating && ` (⭐ ${product.rating}/5)`}
                  </li>
                ))}
                {products.length > 5 && (
                  <li>Y {products.length - 5} productos más...</li>
                )}
              </ul>
            ) : (
              <p>Productos de calidad próximamente disponibles.</p>
            )}
          </div>
        </div>
      </main>
    </DefaultPageLayout>
  )
}
