import { api } from '@cetus/api-client'
import { getImageUrl } from '@cetus/shared/utils/image'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import { FrontStoreHeader } from '@cetus/web/components/front-store/front-store-header'
import { FeaturedProductCard } from '@cetus/web/features/products/components/featured-product-card'
import { getAppUrl } from '@cetus/web/functions/get-app-url'
import { generateCategorySEO, generateSEOTags } from '@cetus/web/shared/seo'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { queryOptions } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useEffect } from 'react'

const categoryBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ['category', slug],
    queryFn: () => api.categories.getBySlug(slug),
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
      api.stores.getById(category.storeId),
      api.products.listByCategory(category.id),
    ])

    return {
      category,
      store,
      products,
      categorySlug: slug,
    }
  },
  head: async ({ loaderData }) => {
    if (!(loaderData?.store && loaderData?.category)) {
      return {
        meta: [
          { title: 'Categoría no encontrada' },
          {
            name: 'description',
            content: 'La categoría que buscas no está disponible.',
          },
          { name: 'robots', content: 'noindex, nofollow' },
        ],
      }
    }

    const { category, store, products, categorySlug } = loaderData

    const appUrl = await getAppUrl()
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : (store.customDomain ?? `${appUrl}/${store.slug}`)

    const seoConfig = generateCategorySEO(
      category,
      store.name,
      baseUrl,
      products,
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
        { rel: 'canonical', href: seoConfig.canonicalUrl },
        // Preload first three product images for LCP
        ...(products?.slice(0, 3).map((product, index) => ({
          rel: 'preload',
          href: getImageUrl(product.imageUrl),
          as: 'image',
          key: `preload-category-product-${index}`,
        })) || []),
        { rel: 'alternate', hrefLang: 'es-CO', href: seoConfig.canonicalUrl },
        { rel: 'alternate', hrefLang: 'es', href: seoConfig.canonicalUrl },
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
      <main>
        <h1>Hubo un problema al cargar los datos de la categoría</h1>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FrontStoreHeader
        hasCustomDomain={Boolean(store.customDomain)}
        store={store}
      />

      <main className="mx-auto w-full max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:px-8">
        <section aria-labelledby="category-hero-heading">
          <h1 className="sr-only" id="category-hero-heading">
            {category.name} en {store.name}
          </h1>
        </section>

        <section aria-labelledby="category-products-heading">
          <h2 className="sr-only" id="category-products-heading">
            Productos en {category.name}
            {products.length > 0 &&
              ` - ${products.length} productos disponibles`}
          </h2>

          <div className="mb-16 flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <Badge className="w-fit rounded-md" variant="outline">
                Colección
              </Badge>
              <h2 className="text-balance font-bold text-3xl tracking-tight sm:text-4xl">
                {category.name}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <FeaturedProductCard
                  key={`${product.id}-${product.variantId}-${product.slug}`}
                  product={product}
                />
              ))}
            </div>

            <div className="grid">
              <Button asChild variant="link">
                <Link to="/products/all">Ver todos los productos</Link>
              </Button>
            </div>
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
    </div>
  )
}
