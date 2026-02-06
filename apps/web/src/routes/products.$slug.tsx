import { api } from '@cetus/api-client'
import { getImageUrl } from '@cetus/shared/utils/image'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@cetus/ui/breadcrumb'
import { Button } from '@cetus/ui/button'
import { Skeleton } from '@cetus/ui/skeleton'
import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { PageHeader } from '@cetus/web/components/page-header'
import { ProductDisplay } from '@cetus/web/features/products/components/product-display'
import { ProductTabs } from '@cetus/web/features/products/components/product-tabs'
import { SuggestedProducts } from '@cetus/web/features/products/components/suggested-product'
import { getAppUrl } from '@cetus/web/functions/get-app-url'
import { setStoreId } from '@cetus/web/functions/store-slug'
import { setupApiClient } from '@cetus/web/lib/api/setup'
import { generateProductSEO, generateSEOTags } from '@cetus/web/shared/seo'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { type } from 'arktype'
import { ChevronRight, Home, HomeIcon } from 'lucide-react'
import { useEffect, useId } from 'react'
import { v7 as uuid } from 'uuid'

const ProductSearchSchema = type({
  variant: type('number>0'),
})

export const Route = createFileRoute('/products/$slug')({
  validateSearch: ProductSearchSchema,
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
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : (store.customDomain ?? appUrl)
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

    return {
      title: seoConfig.title,
      meta: [
        // Essential SEO meta tags
        ...seoTags,

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
  pendingComponent: () => (
    <DefaultPageLayout>
      <ProductDisplaySkeleton />
    </DefaultPageLayout>
  ),
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
  const title = `${product.name} | ${store?.name}`.slice(0, 60)

  return (
    <DefaultPageLayout>
      <title>{title}</title>
      <main className="container flex max-w-7xl flex-col gap-6">
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
                <BreadcrumbLink asChild>
                  <Link
                    aria-label={`Categoría: ${product.category}`}
                    params={{ slug: product.categorySlug }}
                    to="/categories/$slug"
                  >
                    {product.category}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="text-xs">
                <BreadcrumbPage>{product.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </nav>

        <section aria-labelledby="product-info">
          <ProductDisplay
            key={product.id}
            product={product}
            variant={variant}
          />
        </section>

        <section aria-labelledby="product-details" className="space-y-6">
          <ProductTabs reviews={reviews} />
        </section>

        <section aria-labelledby="suggested-products">
          <SuggestedProducts products={suggestions} />
        </section>

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
    </DefaultPageLayout>
  )
}

export function ProductDisplaySkeleton() {
  const id = useId()

  return (
    <div className="container min-h-screen max-w-7xl">
      <div className="px-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-32" />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-50">
              <Skeleton className="h-full w-full" />
            </div>

            <div className="hidden space-x-2 lg:flex">
              {[...new Array(4)].map((_) => (
                <Skeleton
                  className="h-20 w-20 rounded-lg"
                  key={`skeleton-${id}-${uuid()}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Skeleton className="mb-2 h-8 w-3/4" />
              <Skeleton className="mb-4 h-10 w-32" />

              <div className="mb-4 flex items-center space-x-2">
                <div className="flex space-x-1">
                  {[...new Array(5)].map((_) => (
                    <Skeleton
                      className="h-5 w-5 rounded"
                      key={`skeleton-${id}-${uuid()}`}
                    />
                  ))}
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-32" />
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
