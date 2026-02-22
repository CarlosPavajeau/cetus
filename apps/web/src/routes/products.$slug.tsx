import { api } from '@cetus/api-client'
import { getImageUrl } from '@cetus/shared/utils/image'
import { Button } from '@cetus/ui/button'
import { Skeleton } from '@cetus/ui/skeleton'
import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { FrontStoreHeader } from '@cetus/web/components/front-store/front-store-header'
import { PageHeader } from '@cetus/web/components/page-header'
import { ProductImageGallery } from '@cetus/web/features/products/components/product-image-gallery'
import { ProductInfo } from '@cetus/web/features/products/components/product-info'
import { ProductReviews } from '@cetus/web/features/products/components/product-reviews'
import { SuggestedProducts } from '@cetus/web/features/products/components/suggested-product'
import { getAppUrl } from '@cetus/web/functions/get-app-url'
import { setStoreId } from '@cetus/web/functions/store-slug'
import { setupApiClient } from '@cetus/web/lib/api/setup'
import { generateProductSEO, generateSEOTags } from '@cetus/web/shared/seo'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { type } from 'arktype'
import consola from 'consola'
import { Home } from 'lucide-react'
import { useEffect } from 'react'

const productSearchSchema = type({
  variant: type('number>0'),
})

export const Route = createFileRoute('/products/$slug')({
  validateSearch: productSearchSchema,
  beforeLoad: ({ search }) => ({
    variant: search.variant,
  }),
  loader: async ({ params, context }) => {
    const slug = params.slug
    const product = await api.products.getBySlug(slug)
    const store = await api.stores.getById(product.storeId)
    const variant = product.variants.find((v) => v.id === context.variant)

    if (!variant) {
      throw notFound()
    }

    setStoreId({
      data: {
        id: store.id,
      },
    })

    setupApiClient(store.id)

    const [suggestions, reviews] = await Promise.all([
      api.products.listSuggestions(product.id),
      api.reviews.list(product.id),
    ])

    return {
      product,
      suggestions,
      reviews,
      store,
      variant,
    }
  },
  head: async ({ loaderData }) => {
    if (!loaderData) {
      return {}
    }

    const { product, variant, reviews, store } = loaderData

    const appUrl = await getAppUrl()
    const baseUrl = store.customDomain ?? appUrl

    // Generate comprehensive SEO configuration
    const storeName = store.name
    const seoConfig = generateProductSEO(
      product,
      variant,
      storeName,
      baseUrl,
      reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        customerName: review.customer,
        createdAt: review.createdAt,
      })),
    )

    const seoTags = generateSEOTags(seoConfig)

    consola.info('SEO Tags:', seoConfig.title)

    return {
      meta: [
        // Essential SEO meta tags
        ...seoTags,

        // Page title
        { title: seoConfig.title, content: seoConfig.title },

        // Additional product-specific meta tags
        { name: 'product:price:amount', content: variant.price.toString() },
        { name: 'product:price:currency', content: 'COP' },
        {
          name: 'product:availability',
          content: variant.stock > 0 ? 'in_stock' : 'out_of_stock',
        },
        { name: 'product:condition', content: 'new' },

        // Rich snippet meta
        { name: 'rating', content: product.rating.toString() },
        {
          name: 'review_count',
          content: product.reviewsCount.toString(),
        },

        // Mobile optimization
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ].filter((tag) => tag.content), // Remove empty content tags

      links: [
        // Canonical URL to prevent duplicate content
        { rel: 'canonical', href: seoConfig.canonicalUrl },

        // Preload main product image for better performance
        ...(variant.images?.[0]?.imageUrl
          ? [
              {
                rel: 'preload',
                href: getImageUrl(variant.images[0].imageUrl),
                as: 'image',
              },
            ]
          : []),

        // Product-specific structured data
        ...(seoConfig.structuredData
          ? seoConfig.structuredData.map((data, index) => ({
              rel: 'structured-data',
              type: 'application/ld+json',
              href: `data:application/ld+json,${encodeURIComponent(JSON.stringify(data))}`,
              key: `structured-data-${index}`,
            }))
          : []),
      ],

      // Add structured data scripts
      scripts:
        seoConfig.structuredData?.map((data, index) => ({
          type: 'application/ld+json',
          children: JSON.stringify(data, null, 2),
          key: `json-ld-${index}`,
        })) || [],
    }
  },
  component: ProductDetailsPage,
  notFoundComponent: () => (
    <DefaultPageLayout>
      <PageHeader
        subtitle="El producto que estás buscando no existe."
        title="Producto no encontrado"
      />

      <Button asChild>
        <Link to="/">
          <Home className="mr-2 h-4 w-4" />
          Volver al inicio
        </Link>
      </Button>
    </DefaultPageLayout>
  ),
  pendingComponent: () => <ProductDisplaySkeleton />,
})

function ProductDetailsPage() {
  const { product, variant, suggestions, reviews, store } =
    Route.useLoaderData()

  const { actions } = useTenantStore()
  useEffect(() => {
    if (!store) {
      return
    }

    actions.setStore(store)
  }, [actions, store])

  // Generate additional SEO data for the client side
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const productUrl = `${baseUrl}/products/${product.slug}`

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FrontStoreHeader
        hasCustomDomain={Boolean(store.customDomain)}
        store={store}
      />

      <main className="mx-auto w-full max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:px-8">
        <section className="pb-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              <ProductImageGallery images={variant.images} />
              <ProductInfo product={product} variant={variant} />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl">
          <ProductReviews product={product} reviews={reviews} />
        </div>

        <div className="mx-auto max-w-7xl">
          <SuggestedProducts products={suggestions} />
        </div>

        <div className="sr-only">
          <h1>
            {product.name} - Comprar en {store?.name || 'Cetus'}
          </h1>
          <p>
            {product.description && `${product.description} `}
            Precio:
            {variant.price.toLocaleString('es-CO', {
              style: 'currency',
              currency: 'COP',
            })}
            {product.rating && ` | Calificación: ${product.rating}/5 estrellas`}
            {product.reviewsCount && ` (${product.reviewsCount} reseñas)`}
            {product.category && ` | Categoría: ${product.category}`}
            {variant.stock > 0 ? ' | En stock' : ' | Agotado'}
          </p>
          <div>
            <span>Disponible en: {store?.name || 'Cetus'}</span>
            <span>URL del producto: {productUrl}</span>
            {variant.images?.map((image, index) => (
              <span
                data-image-alt={
                  image.altText || `${product.name} - Imagen ${index + 1}`
                }
                data-image-url={image.imageUrl}
                key={image.id}
                style={{ display: 'none' }}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

function ProductDisplaySkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:px-8">
        <section className="pb-8">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              <Skeleton className="h-200 w-full" />
              <Skeleton className="h-150 w-full" />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
